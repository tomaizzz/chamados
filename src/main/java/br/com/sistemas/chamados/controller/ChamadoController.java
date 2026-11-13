package br.com.sistemas.chamados.controller;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.sistemas.chamados.dto.AtribuirTecnicoRequest;
import br.com.sistemas.chamados.dto.ChamadoRequest;
import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.dto.ChamadoResumoResponse;
import br.com.sistemas.chamados.dto.ComentarioRequest;
import br.com.sistemas.chamados.dto.ComentarioResponse;
import br.com.sistemas.chamados.dto.PaginaResponse;
import br.com.sistemas.chamados.dto.ResumoResponse;
import br.com.sistemas.chamados.dto.StatusRequest;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.service.ChamadoService;
import jakarta.validation.Valid;

/**
 * Rotas de chamados. Os caminhos ficam completos em cada método porque
 * a lista de chamados de um cliente fica em /clientes/{id}/chamados.
 */
@RestController
public class ChamadoController {

    private final ChamadoService service;

    public ChamadoController(ChamadoService service) {
        this.service = service;
    }

    @PostMapping("/chamados")
    public ResponseEntity<ChamadoResponse> criar(@Valid @RequestBody ChamadoRequest dto) {
        ChamadoResponse criado = service.criar(dto);
        return ResponseEntity.created(URI.create("/chamados/" + criado.id())).body(criado);
    }

    /** GET /chamados?status=ABERTO&prioridade=ALTA&clienteId=1&page=0&size=10 (todos opcionais) */
    @GetMapping("/chamados")
    public PaginaResponse<ChamadoResumoResponse> listar(
        @RequestParam(required = false) StatusChamado status,
        @RequestParam(required = false) Prioridade prioridade,
        @RequestParam(required = false) Long clienteId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size) {
        return service.listar(status, prioridade, clienteId, page, size);
    }

    /** Números do painel (dashboard por status e prioridade). */
    @GetMapping("/chamados/resumo")
    public ResumoResponse resumo() {
        return service.resumo();
    }

    @GetMapping("/chamados/{id}")
    public ChamadoResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PutMapping("/chamados/{id}")
    public ChamadoResponse atualizar(@PathVariable Long id, @Valid @RequestBody ChamadoRequest dto) {
        return service.atualizar(id, dto);
    }

    @DeleteMapping("/chamados/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/chamados/{id}/status")
    public ChamadoResponse alterarStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest dto) {
        return service.alterarStatus(id, dto.status());
    }

    @PatchMapping("/chamados/{id}/atribuir")
    public ChamadoResponse atribuir(@PathVariable Long id, @Valid @RequestBody AtribuirTecnicoRequest dto) {
        return service.atribuirTecnico(id, dto.tecnicoId());
    }

    @PostMapping("/chamados/{id}/comentarios")
    public ResponseEntity<ComentarioResponse> comentar(@PathVariable Long id,
                                                       @Valid @RequestBody ComentarioRequest dto) {
        ComentarioResponse criado = service.comentar(id, dto);
        return ResponseEntity.created(URI.create("/chamados/" + id)).body(criado);
    }

    @GetMapping("/clientes/{clienteId}/chamados")
    public PaginaResponse<ChamadoResumoResponse> chamadosDoCliente(
        @PathVariable Long clienteId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size) {
        return service.listarDoCliente(clienteId, page, size);
    }
}
