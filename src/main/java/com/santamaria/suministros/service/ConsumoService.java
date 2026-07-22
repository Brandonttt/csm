package com.santamaria.suministros.service;

import com.santamaria.suministros.dto.CuentaResponseDTO;
import com.santamaria.suministros.dto.DetalleInsumoDTO;
import com.santamaria.suministros.model.DetalleConsumo;
import com.santamaria.suministros.model.EventoHospitalario;
import com.santamaria.suministros.model.Medico;
import com.santamaria.suministros.model.Paciente;
import com.santamaria.suministros.repository.DetalleConsumoRepository;
import com.santamaria.suministros.repository.EventoHospitalarioRepository;
import com.santamaria.suministros.repository.InsumoRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ConsumoService {

    @Autowired
    private DetalleConsumoRepository detalleConsumoRepository;

    @Autowired
    private EventoHospitalarioRepository eventoHospitalarioRepository;

    @Autowired
    private InsumoRepository insumoRepository;

    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // =========================================================================
    // MÉTODOS AUXILIARES DE CONVERSIÓN SEGURA
    // =========================================================================

    private Integer parsearEnteroSeguro(Object obj, int valorPorDefecto) {
        if (obj == null)
            return valorPorDefecto;
        String str = obj.toString().trim();
        if (str.isEmpty() || str.equalsIgnoreCase("null"))
            return valorPorDefecto;
        try {
            return Integer.parseInt(str);
        } catch (NumberFormatException e) {
            return valorPorDefecto;
        }
    }

    private LocalDate parsearFechaSegura(Object fechaObj) {
        if (fechaObj == null)
            return null;
        String fechaStr = fechaObj.toString().trim();
        if (fechaStr.isEmpty() || fechaStr.equalsIgnoreCase("null"))
            return null;
        if (fechaStr.length() >= 10) {
            return LocalDate.parse(fechaStr.substring(0, 10));
        }
        return null;
    }

    // =========================================================================
    // SERVICIOS PRINCIPALES
    // =========================================================================

    @Transactional(readOnly = true)
    public CuentaResponseDTO calcularCuentaEstado(Long eventoId) {
        EventoHospitalario evento = eventoHospitalarioRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("No se encontró el evento hospitalario con ID: " + eventoId));

        List<DetalleConsumo> consumos = detalleConsumoRepository.findByEventoId(eventoId);

        List<DetalleInsumoDTO> detallesDTO = consumos.stream().map(c -> {
            String fechaFormateada = "";
            if (c.getFechaAplicacion() != null) {
                fechaFormateada = c.getFechaAplicacion().format(dateFormatter);
            }

            String descripcion = "";
            if (c.getInsumo() != null && c.getInsumo().getDescripcion() != null) {
                descripcion = c.getInsumo().getDescripcion();
            }

            Integer cantidad = c.getCantidad() != null ? c.getCantidad() : 0;
            BigDecimal precioUnit = (c.getInsumo() != null && c.getInsumo().getPrecioUnitario() != null)
                    ? c.getInsumo().getPrecioUnitario()
                    : BigDecimal.ZERO;

            BigDecimal importe = precioUnit.multiply(BigDecimal.valueOf(cantidad));
            String turno = (c.getTurno() != null && !c.getTurno().isBlank()) ? c.getTurno() : "azul";

            return new DetalleInsumoDTO(fechaFormateada, descripcion, cantidad, precioUnit, importe, turno);
        }).collect(Collectors.toList());

        BigDecimal subtotal = detallesDTO.stream()
                .map(DetalleInsumoDTO::getImporte)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal tasaIva = new BigDecimal("0.16");
        BigDecimal iva = subtotal.multiply(tasaIva).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(iva).setScale(2, RoundingMode.HALF_UP);

        String fechaEmision = evento.getFecha() != null ? evento.getFecha().format(dateFormatter) : "";
        String horaSalidaQx = "9:11 PM";
        String procedimiento = (evento.getProcedimiento() != null && !evento.getProcedimiento().isBlank())
                ? evento.getProcedimiento()
                : "ESTANCIA HOSPITALARIA";

        return new CuentaResponseDTO(
                evento.getId(),
                evento.getPaciente() != null ? evento.getPaciente().getNombre() : "",
                evento.getMedico() != null ? evento.getMedico().getNombre() : "",
                procedimiento,
                horaSalidaQx,
                fechaEmision,
                detallesDTO,
                subtotal.setScale(2, RoundingMode.HALF_UP),
                iva,
                total);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarEventosActivos() {
        List<EventoHospitalario> eventos = eventoHospitalarioRepository.findAll();

        return eventos.stream().map(e -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", e.getId());
            dto.put("nombrePaciente", e.getPaciente() != null ? e.getPaciente().getNombre() : "Paciente Desconocido");
            dto.put("habitacion", e.getHabitacion());
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> obtenerDetalleHoja(Long eventoId) {
        EventoHospitalario evento = eventoHospitalarioRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("No se encontró el evento con ID: " + eventoId));

        List<DetalleConsumo> consumos = detalleConsumoRepository.findByEventoId(eventoId);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("eventoId", evento.getId());
        respuesta.put("nombrePaciente", evento.getPaciente() != null ? evento.getPaciente().getNombre() : "");
        respuesta.put("fecha", evento.getFecha() != null ? evento.getFecha().toString() : "");
        respuesta.put("fechaNacimiento",
                evento.getPaciente() != null && evento.getPaciente().getFechaNacimiento() != null
                        ? evento.getPaciente().getFechaNacimiento().toString()
                        : "");
        respuesta.put("habitacion", evento.getHabitacion());
        respuesta.put("nombreMedico", evento.getMedico() != null ? evento.getMedico().getNombre() : "");
        respuesta.put("procedimiento", evento.getProcedimiento());

        List<Map<String, Object>> detalles = consumos.stream().map(c -> {
            Map<String, Object> detMap = new HashMap<>();
            detMap.put("insumoId", c.getInsumo() != null ? c.getInsumo().getId() : null);
            detMap.put("cantidad", c.getCantidad());
            detMap.put("cantidadRecibida", c.getCantidadRecibida());
            detMap.put("ingresoAlSistema", c.getIngresoAlSistema());
            detMap.put("fecha", c.getFechaAplicacion() != null ? c.getFechaAplicacion().toString() : "");
            detMap.put("precioUnitario", c.getInsumo() != null ? c.getInsumo().getPrecioUnitario() : BigDecimal.ZERO);
            detMap.put("turno", c.getTurno() != null ? c.getTurno() : "azul");
            return detMap;
        }).collect(Collectors.toList());

        respuesta.put("detalles", detalles);
        return respuesta;
    }

    @Transactional
    public Long crearCompletoNuevoEvento(Map<String, Object> datos) {
        EventoHospitalario nuevoEvento = new EventoHospitalario();
        nuevoEvento.setHabitacion((String) datos.get("habitacion"));
        nuevoEvento.setProcedimiento((String) datos.get("procedimiento"));

        LocalDate fechaEv = parsearFechaSegura(datos.get("fecha"));
        nuevoEvento.setFecha(fechaEv != null ? fechaEv : LocalDate.now());

        // Gestionar Paciente
        Map<String, Object> pacienteMap = (Map<String, Object>) datos.get("paciente");
        if (pacienteMap != null) {
            Paciente paciente = new Paciente();
            paciente.setNombre((String) pacienteMap.get("nombre"));
            paciente.setFechaNacimiento(parsearFechaSegura(pacienteMap.get("fechaNacimiento")));
            nuevoEvento.setPaciente(paciente);
        }

        // Gestionar Médico
        Map<String, Object> medicoMap = (Map<String, Object>) datos.get("medico");
        if (medicoMap != null) {
            Medico medico = new Medico();
            medico.setNombre((String) medicoMap.get("nombre"));
            nuevoEvento.setMedico(medico);
        }

        nuevoEvento = eventoHospitalarioRepository.save(nuevoEvento);

        // Guardar consumos
        List<Map<String, Object>> consumosRaw = (List<Map<String, Object>>) datos.get("consumos");
        if (consumosRaw != null) {
            for (Map<String, Object> c : consumosRaw) {
                Integer insumoIdParsed = parsearEnteroSeguro(c.get("insumoId"), 0);
                if (insumoIdParsed <= 0)
                    continue;

                DetalleConsumo consumo = new DetalleConsumo();
                consumo.setEvento(nuevoEvento);
                consumo.setInsumo(insumoRepository.findById(Long.valueOf(insumoIdParsed)).orElse(null));
                consumo.setCantidad(parsearEnteroSeguro(c.get("cantidad"), 1));

                if (c.get("cantidadRecibida") != null) {
                    consumo.setCantidadRecibida(parsearEnteroSeguro(c.get("cantidadRecibida"), 0));
                }

                if (c.get("ingresoAlSistema") != null) {
                    consumo.setIngresoAlSistema(Boolean.parseBoolean(c.get("ingresoAlSistema").toString()));
                }

                String turno = c.get("turno") != null ? c.get("turno").toString() : "azul";
                consumo.setTurno(!turno.isBlank() ? turno : "azul");

                LocalDate fechaApp = parsearFechaSegura(c.get("fechaAplicacion"));
                consumo.setFechaAplicacion(fechaApp != null ? fechaApp : LocalDate.now());

                detalleConsumoRepository.save(consumo);
            }
        }

        return nuevoEvento.getId();
    }

    @Transactional
    public void actualizarEventoCompleto(Long eventoId, Map<String, Object> datos) {
        EventoHospitalario evento = eventoHospitalarioRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("No existe el evento clínico con ID: " + eventoId));

        if (datos.get("habitacion") != null) {
            evento.setHabitacion(datos.get("habitacion").toString());
        }
        if (datos.get("procedimiento") != null) {
            evento.setProcedimiento(datos.get("procedimiento").toString());
        }

        LocalDate fechaEv = parsearFechaSegura(datos.get("fecha"));
        if (fechaEv != null) {
            evento.setFecha(fechaEv);
        }

        // Actualizar Paciente
        Map<String, Object> pacienteMap = (Map<String, Object>) datos.get("paciente");
        if (pacienteMap != null && evento.getPaciente() != null) {
            if (pacienteMap.get("nombre") != null) {
                evento.getPaciente().setNombre(pacienteMap.get("nombre").toString());
            }
            LocalDate fechaNac = parsearFechaSegura(pacienteMap.get("fechaNacimiento"));
            if (fechaNac != null) {
                evento.getPaciente().setFechaNacimiento(fechaNac);
            }
        }

        // Actualizar Médico
        Map<String, Object> medicoMap = (Map<String, Object>) datos.get("medico");
        if (medicoMap != null && evento.getMedico() != null && medicoMap.get("nombre") != null) {
            evento.getMedico().setNombre(medicoMap.get("nombre").toString());
        }

        eventoHospitalarioRepository.save(evento);

        // Reemplazar consumos anteriores
        List<DetalleConsumo> consumosAnteriores = detalleConsumoRepository.findByEventoId(eventoId);
        if (!consumosAnteriores.isEmpty()) {
            detalleConsumoRepository.deleteAll(consumosAnteriores);
        }

        List<Map<String, Object>> consumosRaw = (List<Map<String, Object>>) datos.get("consumos");
        if (consumosRaw != null) {
            for (Map<String, Object> c : consumosRaw) {
                Integer insumoIdParsed = parsearEnteroSeguro(c.get("insumoId"), 0);
                if (insumoIdParsed <= 0)
                    continue;

                DetalleConsumo consumo = new DetalleConsumo();
                consumo.setEvento(evento);
                consumo.setInsumo(insumoRepository.findById(Long.valueOf(insumoIdParsed)).orElse(null));
                consumo.setCantidad(parsearEnteroSeguro(c.get("cantidad"), 1));

                if (c.get("cantidadRecibida") != null) {
                    consumo.setCantidadRecibida(parsearEnteroSeguro(c.get("cantidadRecibida"), 0));
                }

                if (c.get("ingresoAlSistema") != null) {
                    consumo.setIngresoAlSistema(Boolean.parseBoolean(c.get("ingresoAlSistema").toString()));
                }

                String turno = c.get("turno") != null ? c.get("turno").toString() : "azul";
                consumo.setTurno(!turno.isBlank() ? turno : "azul");

                LocalDate fechaApp = parsearFechaSegura(c.get("fechaAplicacion"));
                consumo.setFechaAplicacion(fechaApp != null ? fechaApp : LocalDate.now());

                detalleConsumoRepository.save(consumo);
            }
        }
    }
}