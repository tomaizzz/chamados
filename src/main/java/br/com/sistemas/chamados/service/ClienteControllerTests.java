package br.com.sistemas.chamados;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Testa as rotas da seção 10 do documento (sucesso e erros obrigatórios). */
@SpringBootTest
@AutoConfigureMockMvc
class ClienteControllerTest {

    @Autowired
    private MockMvc mvc;

    private static String json(String nome, String email, String telefone) {
        return "{\"nome\":\"" + nome + "\",\"email\":\"" + email + "\",\"telefone\":\"" + telefone + "\"}";
    }

    @Test
    void fluxoCompletoDoCrud() throws Exception {
        String corpo = mvc.perform(post("/clientes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("Ana Souza", "ana@exemplo.com", "47999999999")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andReturn().getResponse().getContentAsString();

        String id = corpo.replaceAll(".*\"id\":(\\d+).*", "$1");

        mvc.perform(get("/clientes")).andExpect(status().isOk());

        mvc.perform(get("/clientes/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("ana@exemplo.com"));

        mvc.perform(put("/clientes/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("Ana Souza Atualizada", "ana@exemplo.com", "47988888888")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nome").value("Ana Souza Atualizada"));

        mvc.perform(post("/clientes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("Outro Cliente", "ana@exemplo.com", "47977777777")))
            .andExpect(status().isConflict());

        mvc.perform(delete("/clientes/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/clientes/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void validacaoRetorna400() throws Exception {
        mvc.perform(post("/clientes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("", "email-invalido", "123")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void jsonMalFormadoRetorna400() throws Exception {
        mvc.perform(post("/clientes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\": \"Ana\", "))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("JSON inválido ou mal formatado"));
    }

    @Test
    void recursoInexistenteRetorna404() throws Exception {
        mvc.perform(get("/clientes/99999")).andExpect(status().isNotFound());
    }
}