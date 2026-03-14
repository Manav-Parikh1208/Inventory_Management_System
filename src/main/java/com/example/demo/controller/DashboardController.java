package com.example.demo.controller;

import com.example.demo.model.Product;
import com.example.demo.model.TransactionStatus;
import com.example.demo.model.TransactionType;
import com.example.demo.model.InventoryTransaction;
import com.example.demo.repository.InventoryTransactionRepository;
import com.example.demo.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private ProductService productService;

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    @GetMapping("/kpis")
    public Map<String, Object> getDashboardKpis() {
        Map<String, Object> kpis = new HashMap<>();
        List<Product> products = productService.getAllProducts();
        kpis.put("totalProducts", products.size());
        kpis.put("lowStockItems", products.stream().filter(p -> p.getCurrentStock() < 10).count());
        kpis.put("pendingReceipts", transactionRepository.findByType(TransactionType.RECEIPT).stream()
                .filter(t -> t.getStatus() != TransactionStatus.DONE && t.getStatus() != TransactionStatus.CANCELED).count());
        kpis.put("pendingDeliveries", transactionRepository.findByType(TransactionType.DELIVERY).stream()
                .filter(t -> t.getStatus() != TransactionStatus.DONE && t.getStatus() != TransactionStatus.CANCELED).count());
        return kpis;
    }

    @GetMapping("/manager-overview")
    public Map<String, Object> getManagerOverview() {
        Map<String, Object> data = new HashMap<>();

        List<Product> allProducts = productService.getAllProducts();
        List<Product> lowStockProducts = allProducts.stream().filter(p -> p.getCurrentStock() < 10).collect(Collectors.toList());

        var allReceipts = transactionRepository.findByType(TransactionType.RECEIPT);
        var pendingReceipts = allReceipts.stream()
                .filter(t -> t.getStatus() != TransactionStatus.DONE && t.getStatus() != TransactionStatus.CANCELED)
                .collect(Collectors.toList());

        var allDeliveries = transactionRepository.findByType(TransactionType.DELIVERY);
        var pendingDeliveries = allDeliveries.stream()
                .filter(t -> t.getStatus() != TransactionStatus.DONE && t.getStatus() != TransactionStatus.CANCELED)
                .collect(Collectors.toList());

        var transfers = transactionRepository.findByType(TransactionType.TRANSFER);

        // KPIs
        data.put("totalProducts", (long) allProducts.size());
        data.put("lowStockCount", lowStockProducts.size());
        data.put("pendingReceiptsCount", pendingReceipts.size());
        data.put("pendingDeliveriesCount", pendingDeliveries.size());
        data.put("transfersCount", transfers.size());

        // Preview lists (max 10 items)
        data.put("products", allProducts.stream().limit(10).collect(Collectors.toList()));
        data.put("lowStockProducts", lowStockProducts.stream().limit(10).collect(Collectors.toList()));
        data.put("pendingReceiptsList", pendingReceipts.stream().limit(10).collect(Collectors.toList()));
        data.put("pendingDeliveriesList", pendingDeliveries.stream().limit(10).collect(Collectors.toList()));
        data.put("transfersList", transfers.stream().limit(10).collect(Collectors.toList()));

        // --- Chart Data ---
        // Category breakdown (for pie/doughnut chart)
        Map<String, Long> categoryMap = allProducts.stream()
                .collect(Collectors.groupingBy(
                    p -> p.getCategory() != null ? p.getCategory() : "Uncategorized",
                    Collectors.counting()));
        data.put("categoryLabels", categoryMap.keySet());
        data.put("categoryCounts", categoryMap.values());

        // Activity stats (for bar chart)
        long receiptsCount = allReceipts.size();
        long deliveriesCount = allDeliveries.size();
        long transfersCount = transfers.size();
        long adjustmentsCount = transactionRepository.findByType(TransactionType.ADJUSTMENT).size();
        data.put("activityLabels", List.of("Receipts", "Deliveries", "Transfers", "Adjustments"));
        data.put("activityCounts", List.of(receiptsCount, deliveriesCount, transfersCount, adjustmentsCount));

        // Default overview — recent 10 transactions of any type
        List<InventoryTransaction> allTx = transactionRepository.findAll();
        allTx.sort((a, b) -> {
            java.time.LocalDateTime tA = a.getTimestamp() != null ? a.getTimestamp() : java.time.LocalDateTime.MIN;
            java.time.LocalDateTime tB = b.getTimestamp() != null ? b.getTimestamp() : java.time.LocalDateTime.MIN;
            return tB.compareTo(tA);
        });
        data.put("recentActivity", allTx.stream().limit(10).collect(Collectors.toList()));

        return data;
    }
}
