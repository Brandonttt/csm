package com.santamaria.suministros.controller;

import com.santamaria.suministros.model.DetalleConsumo;
import com.santamaria.suministros.repository.DetalleConsumoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consumos")
@CrossOrigin(origins = "http://localhost:4200") // Permite la comunicación local con Angular
public class ConsumoController {

    @Autowired
    private DetalleConsumoRepository detalleConsumoRepository;

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
}