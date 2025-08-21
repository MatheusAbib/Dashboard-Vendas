package com.example.Dashboard.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

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
    private LocalDate dataVenda;

    // Novos campos
    private String cidade;
    private String estado;
    private String pais;

    // Opcional: coordenadas para o mapa
    private Double latitude;
    private Double longitude;
}
