package com.example.demo.config;

import com.example.demo.model.Product;
import com.example.demo.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private ProductRepository productRepository;

    @Override
    public void run(String... args) {
        List<Product> products = List.of(
            new Product("Laptop Dell Inspiron", "ELEC-001", "Electronics", "Pcs", 45, "Warehouse A"),
            new Product("Wireless Mouse", "ELEC-002", "Electronics", "Pcs", 120, "Warehouse B"),
            new Product("USB-C Hub Adapter", "ELEC-003", "Electronics", "Pcs", 8, "Warehouse A"),
            new Product("27\" Monitor Samsung", "ELEC-004", "Electronics", "Pcs", 22, "Warehouse C"),
            new Product("A4 Printer Paper", "STAT-001", "Stationery", "Ream", 200, "Warehouse C"),
            new Product("Ballpoint Pens (Box)", "STAT-002", "Stationery", "Box", 5, "Warehouse B"),
            new Product("Sticky Notes Pad", "STAT-003", "Stationery", "Pcs", 90, "Warehouse A"),
            new Product("Office Desk Standard", "FURN-001", "Furniture", "Pcs", 15, "Warehouse A"),
            new Product("Ergonomic Chair", "FURN-002", "Furniture", "Pcs", 3, "Warehouse C"),
            new Product("Filing Cabinet 4-Drawer", "FURN-003", "Furniture", "Pcs", 12, "Warehouse B"),
            new Product("Instant Coffee 500g", "FOOD-001", "Food", "Kg", 30, "Warehouse B"),
            new Product("Bottled Water (Case)", "FOOD-002", "Food", "Case", 60, "Warehouse A"),
            new Product("Tea Bags (100pcs)", "FOOD-003", "Food", "Box", 7, "Warehouse C"),
            new Product("Safety Gloves", "CLOTH-001", "Clothing", "Pair", 75, "Warehouse A"),
            new Product("Hi-Vis Vest", "CLOTH-002", "Clothing", "Pcs", 6, "Warehouse C"),
            new Product("Steel-Toe Boots", "CLOTH-003", "Clothing", "Pair", 18, "Warehouse B"),
            new Product("Whiteboard 120x90", "OFFIC-001", "Office Supplies", "Pcs", 9, "Warehouse A"),
            new Product("Projector Epson", "OFFIC-002", "Office Supplies", "Pcs", 4, "Warehouse C"),
            new Product("Ethernet Cable 5m", "NETW-001", "Networking", "Pcs", 150, "Warehouse B"),
            new Product("WiFi Router TP-Link", "NETW-002", "Networking", "Pcs", 2, "Warehouse A")
        );

        int inserted = 0;
        for (Product p : products) {
            if (productRepository.findBySku(p.getSku()).isEmpty()) {
                productRepository.save(p);
                inserted++;
            }
        }
        if (inserted > 0) {
            System.out.println(">>> DataSeeder: Inserted " + inserted + " new products (skipped existing).");
        }
    }
}
