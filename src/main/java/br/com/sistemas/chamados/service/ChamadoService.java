package br.com.sistemas.chamados.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.sistemas.chamados.dto.ChamadoRequest;
import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.dto.ChamadoResumoResponse;
import br.com.sistemas.chamados.dto.ComentarioRequest;
import br.com.sistemas.chamados.dto.ComentarioResponse;
import br.com.sistemas.chamados.dto.PaginaResponse;
import br.com.sistemas.chamados.dto.ResumoResponse;
import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.entity.Comentario;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.entity.Tecnico;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.repository.CategoriaRepository;
import br.com.sistemas.chamados.repository.ChamadoRepository;
import br.com.sistemas.chamados.repository.ClienteRepository;
import br.com.sistemas.chamados.repository.ComentarioRepository;
import br.com.sistemas.chamados.repository.TecnicoRepository;

@Service
public class ChamadoService {

    private static final int TAMANHO_MAXIMO = 50;

    private final ChamadoRepository repository;
    private final ComentarioRepository comentarioRepository;
    private final ClienteRepository clienteRepository;
    private final CategoriaRepository categoriaRepository;
    private final TecnicoRepository tecnicoRepository;

    public ChamadoService(ChamadoRepository repository,
                          ComentarioRepository comentarioRepository,
                          ClienteRepository clienteRepository,
                          CategoriaRepository categoriaRepository,
                          TecnicoRepository tecnicoRepository) {
        this.repository = repository;
        this.comentarioRepository = comentarioRepository;
        this.clienteRepository = clienteRepository;
        this.categoriaRepository = categoriaRepository;
        this.tecnicoRepository = tecnicoRepository;
    }

    /* ---------- CRUD ---------- */

    @Transactional
    public ChamadoResponse criar(ChamadoRequest dto) {
        Chamado chamado = new Chamado(dto.titulo().trim(), dto.descricao().trim(), dto.prioridade(),
            buscarCliente(dto.clienteId()), buscarCategoria(dto.categoriaId()));
        if (dto.tecnicoId() != null) {
            chamado.setTecnico(buscarTecnico(dto.tecnicoId()));
        }
        return ChamadoResponse.de(repository.save(chamado));
    }

    @Transactional(readOnly = true)
    public ChamadoResponse buscar(Long id) {
        return ChamadoResponse.de(buscarEntity(id));
    }

    @Transactional
    public ChamadoResponse atualizar(Long id, ChamadoRequest dto) {
        Chamado chamado = buscarEntity(id);
        garantirQueNaoEstaFechado(chamado);
        chamado.setTitulo(dto.titulo().trim());
        chamado.setDescricao(dto.descricao().trim());
        chamado.setPrioridade(dto.prioridade());
        chamado.setCliente(buscarCliente(dto.clienteId()));
        chamado.setCategoria(buscarCategoria(dto.categoriaId()));
        chamado.setTecnico(dto.tecnicoId() != null ? buscarTecnico(dto.tecnicoId()) : null);
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public void excluir(Long id) {
        repository.delete(buscarEntity(id));
    }

    /* ---------- Regras de status e atribuição ---------- */

    @Transactional
    public ChamadoResponse alterarStatus(Long id, StatusChamado novo) {
        Chamado chamado = buscarEntity(id);
        garantirQueNaoEstaFechado(chamado);
        if (chamado.getStatus() == novo) {
            throw new RegraNegocioException("O chamado já está com o status " + novo);
        }
        if (!chamado.getStatus().podeIrPara(novo)) {
            throw new RegraNegocioException(
                "Não é possível mudar o status de " + chamado.getStatus() + " para " + novo);
        }
        chamado.alterarStatus(novo);
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public ChamadoResponse atribuirTecnico(Long id, Long tecnicoId) {
        Chamado chamado = buscarEntity(id);
        garantirQueNaoEstaFechado(chamado);
        chamado.setTecnico(buscarTecnico(tecnicoId));
        return ChamadoResponse.de(chamado);
    }

    /* ---------- Comentários ---------- */

    @Transactional
    public ComentarioResponse comentar(Long id, ComentarioRequest dto) {
        Chamado chamado = buscarEntity(id);
        garantirQueNaoEstaFechado(chamado);
        Comentario salvo = comentarioRepository.save(
            new Comentario(dto.autor().trim(), dto.texto().trim(), chamado));
        return ComentarioResponse.de(salvo);
    }

    /* ---------- Consultas com filtro e paginação ---------- */

    @Transactional(readOnly = true)
    public PaginaResponse<ChamadoResumoResponse> listar(StatusChamado status, Prioridade prioridade,
                                                        Long clienteId, int pagina, int tamanho) {
        Pageable pageable = PageRequest.of(
            Math.max(pagina, 0),
            Math.min(Math.max(tamanho, 1), TAMANHO_MAXIMO),
            Sort.by(Sort.Direction.DESC, "dataAbertura", "id"));
        return PaginaResponse.de(
            repository.filtrar(status, prioridade, clienteId, pageable).map(ChamadoResumoResponse::de));
    }

    @Transactional(readOnly = true)
    public PaginaResponse<ChamadoResumoResponse> listarDoCliente(Long clienteId, int pagina, int tamanho) {
        if (!clienteRepository.existsById(clienteId)) {
            throw new RecursoNaoEncontradoException("Cliente " + clienteId + " não encontrado");
        }
        return listar(null, null, clienteId, pagina, tamanho);
    }

    @Transactional(readOnly = true)
    public ResumoResponse resumo() {
        Map<String, Long> porStatus = new LinkedHashMap<>();
        for (StatusChamado s : StatusChamado.values()) {
            porStatus.put(s.name(), repository.countByStatus(s));
        }
        Map<String, Long> porPrioridade = new LinkedHashMap<>();
        for (Prioridade p : Prioridade.values()) {
            porPrioridade.put(p.name(), repository.countByPrioridade(p));
        }
        return new ResumoResponse(repository.count(), porStatus, porPrioridade,
            clienteRepository.count(), categoriaRepository.count(), tecnicoRepository.count());
    }

    /* ---------- Apoio ---------- */

    private void garantirQueNaoEstaFechado(Chamado chamado) {
        if (chamado.isFechado()) {
            throw new RegraNegocioException("Chamado fechado não pode ser alterado");
        }
    }

    private Chamado buscarEntity(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Chamado " + id + " não encontrado"));
    }

    private Cliente buscarCliente(Long id) {
        return clienteRepository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente " + id + " não encontrado"));
    }

    private Categoria buscarCategoria(Long id) {
        return categoriaRepository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria " + id + " não encontrada"));
    }

    private Tecnico buscarTecnico(Long id) {
        return tecnicoRepository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Técnico " + id + " não encontrado"));
    }
}
