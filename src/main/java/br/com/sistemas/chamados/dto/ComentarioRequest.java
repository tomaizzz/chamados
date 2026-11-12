package br.com.sistemas.chamados.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ComentarioRequest(
    @NotBlank(message = "Autor é obrigatório")
    @Size(max = 100, message = "Autor deve ter no máximo 100 caracteres")
    String autor,

    @NotBlank(message = "Comentário é obrigatório")
    @Size(max = 1000, message = "Comentário deve ter no máximo 1000 caracteres")
    String texto
) { }
