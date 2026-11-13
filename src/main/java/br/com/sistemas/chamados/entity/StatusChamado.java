package br.com.sistemas.chamados.entity;

import java.util.Arrays;
import java.util.List;

/**
 * Situação do chamado e as mudanças de status permitidas.
 *
 * ABERTO             -> EM_ATENDIMENTO, FECHADO
 * EM_ATENDIMENTO     -> AGUARDANDO_CLIENTE, FECHADO
 * AGUARDANDO_CLIENTE -> EM_ATENDIMENTO, FECHADO
 * FECHADO            -> (nenhum: chamado fechado não muda mais)
 */
public enum StatusChamado {
    ABERTO,
    EM_ATENDIMENTO,
    AGUARDANDO_CLIENTE,
    FECHADO;

    public boolean podeIrPara(StatusChamado novo) {
        return switch (this) {
            case ABERTO -> novo == EM_ATENDIMENTO || novo == FECHADO;
            case EM_ATENDIMENTO -> novo == AGUARDANDO_CLIENTE || novo == FECHADO;
            case AGUARDANDO_CLIENTE -> novo == EM_ATENDIMENTO || novo == FECHADO;
            case FECHADO -> false;
        };
    }

    /** Status para os quais este pode mudar (usado pelo front para montar os botões). */
    public List<StatusChamado> proximos() {
        return Arrays.stream(values()).filter(this::podeIrPara).toList();
    }
}
