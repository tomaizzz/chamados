package br.com.sistemas.chamados.dto;

import java.time.LocalDateTime;
import java.util.List;

import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;

/** Chamado completo, com relacionamentos, comentários e os próximos status permitidos. */
public record ChamadoResponse(
    Long id,
    String titulo,
    String descricao,
    Prioridade prioridade,
    StatusChamado status,
    List<StatusChamado> proximosStatus,
    LocalDateTime dataAbertura,
    LocalDateTime dataFechamento,
    Long clienteId,
    String clienteNome,
    Long categoriaId,
    String categoriaNome,
    Long tecnicoId,
    String tecnicoNome,
    List<ComentarioResponse> comentarios
) {
    public static ChamadoResponse de(Chamado c) {
        return new ChamadoResponse(
            c.getId(), c.getTitulo(), c.getDescricao(), c.getPrioridade(), c.getStatus(),
            c.getStatus().proximos(),
            c.getDataAbertura(), c.getDataFechamento(),
            c.getCliente().getId(), c.getCliente().getNome(),
            c.getCategoria().getId(), c.getCategoria().getNome(),
            c.getTecnico() != null ? c.getTecnico().getId() : null,
            c.getTecnico() != null ? c.getTecnico().getNome() : null,
            c.getComentarios().stream().map(ComentarioResponse::de).toList());
    }
}
