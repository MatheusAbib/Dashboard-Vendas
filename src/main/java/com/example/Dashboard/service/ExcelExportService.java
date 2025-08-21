package com.example.Dashboard.service;

import com.example.Dashboard.model.Venda;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExcelExportService {

    public ByteArrayInputStream exportarVendas(List<Venda> vendas) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Vendas");

            // Cabeçalho
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("ID");
            header.createCell(1).setCellValue("Produto");
            header.createCell(2).setCellValue("Categoria");
            header.createCell(3).setCellValue("Quantidade");
            header.createCell(4).setCellValue("Valor");
            header.createCell(5).setCellValue("Data Venda");

            // Dados
            int rowIdx = 1;
            for (Venda v : vendas) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(v.getId());
                row.createCell(1).setCellValue(v.getProduto());
                row.createCell(2).setCellValue(v.getCategoria());
                row.createCell(3).setCellValue(v.getQuantidade());
                row.createCell(4).setCellValue(v.getValor());
                row.createCell(5).setCellValue(v.getDataVenda().toString());
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }
}
