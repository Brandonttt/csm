package com.santamaria.suministros.service;

import com.santamaria.suministros.dto.CuentaPacienteDTO;
import com.santamaria.suministros.dto.DetalleFilaDTO;
import com.santamaria.suministros.model.DetalleConsumo;
import com.santamaria.suministros.model.EventoHospitalario;
import com.santamaria.suministros.repository.DetalleConsumoRepository;
import com.santamaria.suministros.repository.EventoHospitalarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class CuentaService {

    @Autowired
    private EventoHospitalarioRepository eventoRepository;

    @Autowired
    private DetalleConsumoRepository detalleConsumoRepository;

    public CuentaPacienteDTO calcularCuentaTotal(Long eventoId) {
        // 1. Validar que el evento (la hoja) exista
        EventoHospitalario evento = eventoRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("El evento hospitalario no existe con ID: " + eventoId));

        // 2. Traer todos los insumos que registró enfermería para este evento
        List<DetalleConsumo> consumos = detalleConsumoRepository.findByEventoId(eventoId);

        BigDecimal subtotal = BigDecimal.ZERO;
        List<DetalleFilaDTO> filasDto = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        // 3. Iterar fila por fila calculando el coste automático
        for (DetalleConsumo consumo : consumos) {

            // 🛠️ OBTENER PRECIO: Si es de catálogo usa su precio; si es manual usa
            // precioUnitarioAplicado
            BigDecimal precio = (consumo.getInsumo() != null && consumo.getInsumo().getPrecioUnitario() != null)
                    ? consumo.getInsumo().getPrecioUnitario()
                    : (consumo.getPrecioUnitarioAplicado() != null ? consumo.getPrecioUnitarioAplicado()
                            : BigDecimal.ZERO);

            // 🛠️ OBTENER DESCRIPCIÓN: Si es de catálogo usa su descripción; si es manual
            // usa descripcionManual
            String descripcion = (consumo.getInsumo() != null && consumo.getInsumo().getDescripcion() != null)
                    ? consumo.getInsumo().getDescripcion()
                    : (consumo.getDescripcionManual() != null ? consumo.getDescripcionManual() : "SIN DESCRIPCIÓN");

            Integer cantInt = consumo.getCantidad() != null ? consumo.getCantidad() : 0;
            BigDecimal cantidad = new BigDecimal(cantInt);

            // Operación: Cantidad * Precio Unitario
            BigDecimal costeoFila = precio.multiply(cantidad);

            // Acumular en el subtotal global
            subtotal = subtotal.add(costeoFila);

            // Formatear la fecha
            String fechaStr = consumo.getFechaAplicacion() != null
                    ? consumo.getFechaAplicacion().format(formatter)
                    : "";

            // Mapear al formato de la fila para Recepción
            DetalleFilaDTO fila = new DetalleFilaDTO(
                    fechaStr,
                    descripcion,
                    cantInt,
                    precio,
                    costeoFila);
            filasDto.add(fila);
        }

        // 4. Calcular Impuestos (IVA del 16% sobre el subtotal)
        BigDecimal iva = subtotal.multiply(new BigDecimal("0.16")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(iva).setScale(2, RoundingMode.HALF_UP);

        // 5. Armar el DTO final estructurado
        CuentaPacienteDTO cuenta = new CuentaPacienteDTO();
        cuenta.setNombrePaciente(evento.getPaciente() != null ? evento.getPaciente().getNombre() : "");
        cuenta.setMedicoTratante(evento.getMedico() != null ? evento.getMedico().getNombre() : "");
        cuenta.setHabitacion(evento.getHabitacion());
        cuenta.setProcedimiento(evento.getProcedimiento());
        cuenta.setFilas(filasDto);
        cuenta.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        cuenta.setIva(iva);
        cuenta.setTotal(total);

        return cuenta;
    }
}