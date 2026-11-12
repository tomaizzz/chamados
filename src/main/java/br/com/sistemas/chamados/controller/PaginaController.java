package br.com.sistemas.chamados.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller de PÁGINAS (front-end).
 * Diferente do ClienteController (@RestController, que devolve JSON),
 * este usa @Controller e devolve o nome de um template do Thymeleaf.
 * Os dados da tela são buscados pelo JavaScript na própria API REST.
 */
@Controller
public class PaginaController {

    @GetMapping("/")
    public String inicio() {
        return "index"; // src/main/resources/templates/index.html
    }
}
