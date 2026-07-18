package com.santamaria.suministros.controller;

import com.santamaria.suministros.dto.CuentaPacienteDTO;
import com.santamaria.suministros.service.CuentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cuentas")
@CrossOrigin("*")
public class CuentaController {

    @Autowired
    private CuentaService cuentaService;

    // GET para obtener la cuenta automatizada (Subtotal, IVA, Total) de un paciente por su Evento ID
    @GetMapping("/evento/{eventoId}")
    public ResponseEntity<CuentaPacienteDTO> obtenerCuentaPaciente(@PathVariable Long eventoId) {
        CuentaPacienteDTO cuenta = cuentaService.calcularCuentaTotal(eventoId);
        return ResponseEntity.ok(cuenta);
    }
}