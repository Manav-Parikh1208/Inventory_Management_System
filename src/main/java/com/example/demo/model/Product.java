package com.example.demo.model;

import jakarta.persistence.*;
import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "products")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String sku;

    private String category;
    private String uom; // Unit of Measure
    private String location; // Warehouse location

    private Integer currentStock = 0;

    // Constructors
    public Product() {}

    public Product(String name, String sku, String category, String uom, Integer currentStock, String location) {
        this.name = name;
        this.sku = sku;
        this.category = category;
        this.uom = uom;
        this.currentStock = currentStock;
        this.location = location;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getUom() { return uom; }
    public void setUom(String uom) { this.uom = uom; }
    public Integer getCurrentStock() { return currentStock; }
    public void setCurrentStock(Integer currentStock) { this.currentStock = currentStock; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}
