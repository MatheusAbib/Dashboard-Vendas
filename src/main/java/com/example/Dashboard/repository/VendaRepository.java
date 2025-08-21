package com.example.Dashboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.Dashboard.model.Venda;


public interface VendaRepository extends JpaRepository<Venda, Long> {
}
