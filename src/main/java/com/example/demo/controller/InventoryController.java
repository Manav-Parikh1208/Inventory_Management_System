package com.example.demo.controller;

import com.example.demo.dto.InventoryOperationRequest;
import com.example.demo.model.InventoryTransaction;
import com.example.demo.model.TransactionType;
import com.example.demo.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/operations")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @GetMapping("/history")
    public List<InventoryTransaction> getHistory() {
        return inventoryService.getAllTransactions();
    }

    @PostMapping("/receipts")
    public InventoryTransaction createReceipt(@RequestBody InventoryOperationRequest request) {
        return inventoryService.processOperation(TransactionType.RECEIPT, request);
    }

    @PostMapping("/deliveries")
    public InventoryTransaction createDelivery(@RequestBody InventoryOperationRequest request) {
        return inventoryService.processOperation(TransactionType.DELIVERY, request);
    }

    @PostMapping("/transfers")
    public InventoryTransaction createTransfer(@RequestBody InventoryOperationRequest request) {
        return inventoryService.processOperation(TransactionType.TRANSFER, request);
    }

    @PostMapping("/adjustments")
    public InventoryTransaction createAdjustment(@RequestBody InventoryOperationRequest request) {
        return inventoryService.processOperation(TransactionType.ADJUSTMENT, request);
    }

    @GetMapping("/pending/receipts")
    public java.util.List<InventoryTransaction> getPendingReceipts() {
        return inventoryService.getPendingByType(TransactionType.RECEIPT);
    }

    @GetMapping("/pending/deliveries")
    public java.util.List<InventoryTransaction> getPendingDeliveries() {
        return inventoryService.getPendingByType(TransactionType.DELIVERY);
    }

    @PatchMapping("/{id}/status")
    public InventoryTransaction updateStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        return inventoryService.updateTransactionStatus(id, body.get("status"));
    }
}
