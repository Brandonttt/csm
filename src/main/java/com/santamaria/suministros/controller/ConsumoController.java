package com.santamaria.suministros.controller;

import com.santamaria.suministros.dto.CuentaResponseDTO;
import com.santamaria.suministros.model.DetalleConsumo;
import com.santamaria.suministros.model.EventoHospitalario;
import com.santamaria.suministros.repository.DetalleConsumoRepository;
import com.santamaria.suministros.repository.EventoHospitalarioRepository;
import com.santamaria.suministros.service.ConsumoService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/consumos")
@CrossOrigin(origins = "http://localhost:4200") // Permite la comunicación local con Angular
public class ConsumoController {

    @Autowired
    private DetalleConsumoRepository detalleConsumoRepository;
    @Autowired
    private ConsumoService consumoService;
    @Autowired
    private EventoHospitalarioRepository eventoHospitalarioRepository;

    // POST para guardar un nuevo consumo desde la hoja de enfermería
    @PostMapping
    public ResponseEntity<DetalleConsumo> registrarConsumo(@RequestBody DetalleConsumo consumo) {
        DetalleConsumo nuevoConsumo = detalleConsumoRepository.save(consumo);
        return new ResponseEntity<>(nuevoConsumo, HttpStatus.CREATED);
    }

    // POST masivo por si enfermería guarda toda la lista de la hoja de un solo
    // golpe
    @PostMapping("/lista")
    public ResponseEntity<List<DetalleConsumo>> registrarListaConsumos(@RequestBody List<DetalleConsumo> consumos) {
        List<DetalleConsumo> nuevosConsumos = detalleConsumoRepository.saveAll(consumos);
        return new ResponseEntity<>(nuevosConsumos, HttpStatus.CREATED);
    }

    @GetMapping("/evento/{eventoId}/cuenta")
    public ResponseEntity<CuentaResponseDTO> obtenerCuentaPorEvento(@PathVariable Long eventoId) {
        try {
            CuentaResponseDTO cuenta = consumoService.calcularCuentaEstado(eventoId);
            return ResponseEntity.ok(cuenta);
        } catch (RuntimeException e) {
            // Si el ID del evento no existe, responde con un 404 Not Found
            return ResponseEntity.notFound().build();
        }
    }

    // ==========================================
    // NUEVOS ENDPOINTS AGREGADOS
    // ==========================================

    // 1. GET para obtener los pacientes/eventos activos para el dropdown
    @GetMapping("/eventos/activos")
    public ResponseEntity<List<Map<String, Object>>> obtenerEventosActivos() {
        try {
            // Nota: Debes declarar este método en tu ConsumoService
            List<Map<String, Object>> eventos = consumoService.listarEventosActivos();
            return ResponseEntity.ok(eventos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // 2. GET para recuperar la cabecera del evento e insumos cargados previamente
    @GetMapping("/evento/{eventoId}/detalle")
    public ResponseEntity<Map<String, Object>> obtenerDetalleEventoConConsumos(@PathVariable Long eventoId) {
        try {
            // Nota: Debes declarar este método en tu ConsumoService
            Map<String, Object> detalle = consumoService.obtenerDetalleHoja(eventoId);
            return ResponseEntity.ok(detalle);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // 3. PUT para actualizar la lista de insumos de un evento existente
    @PutMapping("/evento/{eventoId}")
    public ResponseEntity<Map<String, Object>> actualizarHojaConsumos(
            @PathVariable Long eventoId,
            @RequestBody List<DetalleConsumo> nuevosConsumos) {
        try {
            // Nota: Debes declarar este método en tu ConsumoService
            consumoService.actualizarConsumosEvento(eventoId, nuevosConsumos);

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("mensaje", "Hoja de insumos actualizada con éxito");
            respuesta.put("idEventoGenerated", eventoId);

            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/evento/nuevo")
    public ResponseEntity<Map<String, Object>> crearNuevoEventoConConsumos(@RequestBody Map<String, Object> datos) {
        try {
            // Delegamos al servicio la creación del Paciente, Médico y el
            // EventoHospitalario
            Long nuevoIdEvento = consumoService.crearCompletoNuevoEvento(datos);

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("mensaje", "Evento creado correctamente");
            respuesta.put("idEventoGenerated", nuevoIdEvento);

            return new ResponseEntity<>(respuesta, HttpStatus.CREATED);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/evento")
    public ResponseEntity<EventoHospitalario> crearEvento(@RequestBody EventoHospitalario evento) {
        // Si tienes relaciones con Paciente o Medico en cascada, asegúrate de
        // persistirlas o asignarlas aquí
        EventoHospitalario nuevoEvento = eventoHospitalarioRepository.save(evento);
        return new ResponseEntity<>(nuevoEvento, HttpStatus.CREATED);
    }
}