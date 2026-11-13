package br.com.sistemas.chamados.dto;

import java.time.LocalDateTime;

import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;

/** Versão curta do chamado, usada nas listagens. */
public record ChamadoResumoResponse(
    Long id,
    String titulo,
    Prioridade prioridade,
    StatusChamado status,
    LocalDateTime dataAbertura,
    Long clienteId,
    String clienteNome,
    String categoriaNome,
    String tecnicoNome
) {
    public static ChamadoResumoResponse de(Chamado c) {
        return new ChamadoResumoResponse(
            c.getId(), c.getTitulo(), c.getPrioridade(), c.getStatus(), c.getDataAbertura(),
            c.getCliente().getId(), c.getCliente().getNome(),
            c.getCategoria().getNome(),
            c.getTecnico() != null ? c.getTecnico().getNome() : null);
    }
}
