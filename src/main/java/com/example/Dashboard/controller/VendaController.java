package com.example.Dashboard.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.example.Dashboard.model.Venda;
import com.example.Dashboard.repository.VendaRepository;
import com.example.Dashboard.service.ExcelExportService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vendas")
@CrossOrigin(origins = "*") // permitir frontend acessar
public class VendaController {

    @Autowired
    private VendaRepository vendaRepository;

    @Autowired
    private ExcelExportService excelExportService;

    @Autowired
    private ObjectMapper objectMapper; // Jackson para parse de JSON

    // Listar todas as vendas
    @GetMapping
    public List<Venda> listar() {
        return vendaRepository.findAll();
    }

    // Adicionar uma nova venda
    @PostMapping
    public Venda adicionar(@RequestBody Venda venda) {
        preencherCoordenadas(venda);
        return vendaRepository.save(venda);
    }

    // Atualizar venda existente
    @PutMapping("/{id}")
    public ResponseEntity<Venda> atualizar(@PathVariable Long id, @RequestBody Venda vendaAtualizada) {
        return vendaRepository.findById(id)
                .map(venda -> {
                    venda.setProduto(vendaAtualizada.getProduto());
                    venda.setCategoria(vendaAtualizada.getCategoria());
                    venda.setQuantidade(vendaAtualizada.getQuantidade());
                    venda.setValor(vendaAtualizada.getValor());
                    venda.setCidade(vendaAtualizada.getCidade());
                    venda.setEstado(vendaAtualizada.getEstado());
                    venda.setPais(vendaAtualizada.getPais());
                    venda.setCep(vendaAtualizada.getCep());

                    preencherCoordenadas(venda); // Atualiza latitude e longitude

                    Venda atualizado = vendaRepository.save(venda);
                    return ResponseEntity.ok(atualizado);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Deletar venda pelo ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        if (vendaRepository.existsById(id)) {
            vendaRepository.deleteById(id);
            return ResponseEntity.noContent().build(); // 204
        } else {
            return ResponseEntity.notFound().build(); // 404
        }
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

    private void preencherCoordenadas(Venda venda) {
        try {
            if (venda.getCidade() != null && venda.getEstado() != null && venda.getPais() != null) {
                String endereco = String.join(",", venda.getCidade(), venda.getEstado(), venda.getPais());
                String url = "https://nominatim.openstreetmap.org/search?q="
                        + URLEncoder.encode(endereco, "UTF-8")
                        + "&format=json&limit=1";

                HttpClient client = HttpClient.newHttpClient();
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("User-Agent", "Dashboard-Vendas/1.0")
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                // Parse JSON com Jackson
                List<Map<String, Object>> lista = objectMapper.readValue(response.body(), List.class);
                if (!lista.isEmpty()) {
                    Map<String, Object> obj = lista.get(0);
                    Double lat = Double.valueOf(obj.get("lat").toString());
                    Double lon = Double.valueOf(obj.get("lon").toString());
                    venda.setLatitude(lat);
                    venda.setLongitude(lon);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @GetMapping("/atualizar-coordenadas")
public String atualizarCoordenadas() {
    List<Venda> vendas = vendaRepository.findAll();
    vendas.forEach(v -> {
        if (v.getLatitude() == null || v.getLongitude() == null) {
            preencherCoordenadas(v);
            vendaRepository.save(v);
        }
    });
    return "Coordenadas atualizadas!";
}



}
