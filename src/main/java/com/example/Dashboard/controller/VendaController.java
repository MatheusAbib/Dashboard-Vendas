package com.example.Dashboard.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.example.Dashboard.model.Venda;
import com.example.Dashboard.repository.VendaRepository;
import com.example.Dashboard.service.ExcelExportService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/vendas")
@CrossOrigin(origins = "*") // permitir frontend acessar
public class VendaController {

    @Autowired
    private VendaRepository vendaRepository;

    @Autowired
    private ExcelExportService excelExportService;

    // Listar todas as vendas
    @GetMapping
    public List<Venda> listar() {
        return vendaRepository.findAll(); 
    }

    // Adicionar uma nova venda
    @PostMapping
    public Venda adicionar(@RequestBody Venda venda) {
        return vendaRepository.save(venda);
    }

    // Exportar vendas para Excel
    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportarExcel() throws IOException {
        List<Venda> vendas = vendaRepository.findAll();
        ByteArrayInputStream in = excelExportService.exportarVendas(vendas);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=vendas.xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(in.readAllBytes());
    }
}
