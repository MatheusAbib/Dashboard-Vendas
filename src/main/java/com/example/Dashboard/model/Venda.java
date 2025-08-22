package com.example.Dashboard.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Venda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String produto;
    private String categoria;
    private int quantidade;
    private double valor;

    private String cidade;
    private String estado;
    private String pais;
    private String cep;

    private Double latitude;  
    private Double longitude;

    @Column(name = "data_venda", nullable = false, updatable = false)
    private LocalDateTime dataVenda;

@PrePersist
protected void onCreate() {
    this.dataVenda = ZonedDateTime.now(ZoneId.of("America/Sao_Paulo")).toLocalDateTime();
}
}
