package br.com.sistemas.chamados.dto;

import java.util.Map;

/** Números do painel: chamados por status e por prioridade, mais o total de cadastros. */
public record ResumoResponse(
    long totalChamados,
    Map<String, Long> porStatus,
    Map<String, Long> porPrioridade,
    long clientes,
    long categorias,
    long tecnicos
) { }
