package br.com.sistemas.chamados.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Interação registrada no histórico de um chamado. */
@Entity
@Table(name = "comentarios")
public class Comentario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String texto;

    @Column(nullable = false)
    private LocalDateTime data;

    @Column(nullable = false, length = 100)
    private String autor;

    @ManyToOne(optional = false)
    @JoinColumn(name = "chamado_id", nullable = false)
    private Chamado chamado;

    protected Comentario() { }

    public Comentario(String autor, String texto, Chamado chamado) {
        this.autor = autor;
        this.texto = texto;
        this.chamado = chamado;
        this.data = LocalDateTime.now().withNano(0);
    }

    public Long getId() { return id; }
    public String getTexto() { return texto; }
    public LocalDateTime getData() { return data; }
    public String getAutor() { return autor; }
    public Chamado getChamado() { return chamado; }
}
