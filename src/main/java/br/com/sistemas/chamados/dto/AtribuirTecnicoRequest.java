package br.com.sistemas.chamados.dto;

import jakarta.validation.constraints.NotNull;

/** Corpo do PATCH /chamados/{id}/atribuir */
public record AtribuirTecnicoRequest(
    @NotNull(message = "Técnico é obrigatório")
    Long tecnicoId
) { }
