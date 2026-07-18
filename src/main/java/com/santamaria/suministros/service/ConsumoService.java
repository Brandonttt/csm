package com.santamaria.suministros.service;

import com.santamaria.suministros.dto.CuentaResponseDTO;
import com.santamaria.suministros.dto.DetalleInsumoDTO;
import com.santamaria.suministros.model.DetalleConsumo;
import com.santamaria.suministros.model.EventoHospitalario;
import com.santamaria.suministros.repository.DetalleConsumoRepository;
import com.santamaria.suministros.repository.EventoHospitalarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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

    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public CuentaResponseDTO calcularCuentaEstado(Long eventoId) {
        // 1. Validar que el evento hospitalario exista
        EventoHospitalario evento = eventoHospitalarioRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("No se encontró el evento hospitalario con ID: " + eventoId));

        // 2. Recuperar todos los insumos consumidos en ese evento
        List<DetalleConsumo> consumos = detalleConsumoRepository.findByEventoId(eventoId);

        // 3. Mapear cada consumo al formato del renglón DTO
        List<DetalleInsumoDTO> detallesDTO = consumos.stream().map(c -> {
            String fechaFormateada = c.getFechaAplicacion() != null ? c.getFechaAplicacion().format(dateFormatter) : "";
            String descripcion = c.getInsumo().getDescripcion();
            Integer cantidad = c.getCantidad();
            BigDecimal precioUnit = c.getInsumo().getPrecioUnitario();

            // Importe = Cantidad * Precio Unitario
            BigDecimal importe = precioUnit.multiply(BigDecimal.valueOf(cantidad));

            return new DetalleInsumoDTO(fechaFormateada, descripcion, cantidad, precioUnit, importe);
        }).collect(Collectors.toList());

        // 4. Calcular la sumatoria del Subtotal usando Streams
        BigDecimal subtotal = detallesDTO.stream()
                .map(DetalleInsumoDTO::getImporte)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 5. Calcular IVA (16%) y Total final
        BigDecimal tasaIva = new BigDecimal("0.16");
        BigDecimal iva = subtotal.multiply(tasaIva).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(iva).setScale(2, RoundingMode.HALF_UP);

        // Formatear la fecha de emisión del reporte
        String fechaEmision = evento.getFecha() != null ? evento.getFecha().format(dateFormatter) : "";

        // Supongamos que la hora de salida de QX o campos extra vienen del evento
        String horaSalidaQx = "9:11 PM";

        // 6. Construir y retornar el DTO de respuesta estructurado
        return new CuentaResponseDTO(
                evento.getId(),
                evento.getPaciente().getNombre(),
                evento.getMedico().getNombre(),
                horaSalidaQx,
                fechaEmision,
                detallesDTO,
                subtotal.setScale(2, RoundingMode.HALF_UP),
                iva,
                total);
    }

    // =========================================================================
    // NUEVOS MÉTODOS INTEGRADOS
    // =========================================================================

    /**
     * 1. Lista los eventos que se encuentran activos para poblar el dropdown
     * superior de Angular.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarEventosActivos() {
        // Asumiendo que recuperamos todos los eventos. Si manejas un estatus de activo,
        // puedes cambiar a findByActivo(true)
        List<EventoHospitalario> eventos = eventoHospitalarioRepository.findAll();

        return eventos.stream().map(e -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", e.getId());
            dto.put("nombrePaciente", e.getPaciente() != null ? e.getPaciente().getNombre() : "Paciente Desconocido");
            dto.put("habitacion", e.getHabitacion());
            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * 2. Recupera toda la información de la cabecera del evento clínico junto con
     * los
     * insumos cargados previamente para repoblar la cuadrícula reactiva de Angular.
     */
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

        // Mapeamos los insumos existentes
        List<Map<String, Object>> detalles = consumos.stream().map(c -> {
            Map<String, Object> detMap = new HashMap<>();
            detMap.put("insumoId", c.getInsumo().getId());
            detMap.put("cantidad", c.getCantidad());
            detMap.put("cantidadRecibida", c.getCantidadRecibida());
            detMap.put("ingresoAlSistema", c.getIngresoAlSistema());
            detMap.put("fecha", c.getFechaAplicacion() != null ? c.getFechaAplicacion().toString() : "");
            detMap.put("precioUnitario", c.getInsumo().getPrecioUnitario());
            return detMap;
        }).collect(Collectors.toList());

        respuesta.put("detalles", detalles);
        return respuesta;
    }

    /**
     * 3. Sincroniza la lista de insumos de un evento existente (Estrategia
     * Reemplazo Seguro).
     * Borra lo viejo asociado a ese ID de evento y persiste lo nuevo que la
     * enfermera modificó.
     */
    @Transactional
    public void actualizarConsumosEvento(Long eventoId, List<DetalleConsumo> nuevosConsumos) {
        // Validar primero que exista el evento clínico
        EventoHospitalario evento = eventoHospitalarioRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("No se puede actualizar; no existe el evento ID: " + eventoId));

        // 1. Eliminar los insumos registrados con anterioridad en ese evento
        List<DetalleConsumo> consumosAnteriores = detalleConsumoRepository.findByEventoId(eventoId);
        if (!consumosAnteriores.isEmpty()) {
            detalleConsumoRepository.deleteAll(consumosAnteriores);
        }

        // 2. Asociar cada nuevo consumo al evento y salvarlos masivamente en la BD
        if (nuevosConsumos != null && !nuevosConsumos.isEmpty()) {
            nuevosConsumos.forEach(c -> c.setEvento(evento));
            detalleConsumoRepository.saveAll(nuevosConsumos);
        }
    }

    @Transactional
    public Long crearCompletoNuevoEvento(Map<String, Object> datos) {
        // 1. Aquí creas o asocias el Evento Hospitalario con los datos de la cabecera
        EventoHospitalario nuevoEvento = new EventoHospitalario();
        nuevoEvento.setHabitacion((String) datos.get("habitacion"));
        nuevoEvento.setProcedimiento((String) datos.get("procedimiento"));
        // Asignar fechas, y si manejas entidades Paciente/Medico, puedes instanciarlas
        // o buscarlas aquí

        // Guardamos la cabecera para que la base de datos le genere su propio ID único
        // (ej: ID = 2)
        nuevoEvento = eventoHospitalarioRepository.save(nuevoEvento);

        // 2. Extraer los consumos adjuntos y asociarlos al ID recién generado
        List<Map<String, Object>> consumosRaw = (List<Map<String, Object>>) datos.get("consumos");
        if (consumosRaw != null) {
            for (Map<String, Object> c : consumosRaw) {
                DetalleConsumo consumo = new DetalleConsumo();
                consumo.setEvento(nuevoEvento); // 🚀 ¡Aquí está la magia! Se vincula al ID real generado
                consumo.setCantidad((Integer) c.get("cantidad"));
                // Asignar cantidadRecibida, ingresoAlSistema, e Insumo buscando por ID...

                detalleConsumoRepository.save(consumo);
            }
        }

        return nuevoEvento.getId();
    }
}