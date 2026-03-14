package com.example.demo.service;

import com.example.demo.dto.InventoryOperationRequest;
import com.example.demo.model.*;
import com.example.demo.repository.InventoryTransactionRepository;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class InventoryService {

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private UserRepository userRepository;

    public List<InventoryTransaction> getAllTransactions() {
        return transactionRepository.findAll();
    }

    @Transactional
    public InventoryTransaction processOperation(TransactionType type, InventoryOperationRequest request) {
        String currentUsername = ((UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUsername();
        User currentUser = userRepository.findByUsername(currentUsername).orElseThrow();
        Product product = productRepository.findById(request.getProductId()).orElseThrow(() -> new RuntimeException("Product not found"));

        InventoryTransaction tx = new InventoryTransaction();
        tx.setType(type);
        tx.setProduct(product);
        tx.setQuantity(request.getQuantity());
        tx.setTimestamp(LocalDateTime.now());
        tx.setStatus(TransactionStatus.WAITING); // New orders start as WAITING
        tx.setCreatedBy(currentUser);
        tx.setSourceText(request.getSource());
        tx.setDestinationText(request.getDestination());

        if (request.getFromLocationId() != null) {
            tx.setFromLocation(locationRepository.findById(request.getFromLocationId()).orElse(null));
        }
        if (request.getToLocationId() != null) {
            tx.setToLocation(locationRepository.findById(request.getToLocationId()).orElse(null));
        }

        // Stock adjustments only happen when order is fulfilled (kept here for backwards compat)
        // For new WAITING orders, stock is not adjusted until confirmed

        return transactionRepository.save(tx);
    }

    public List<InventoryTransaction> getPendingByType(TransactionType type) {
        return transactionRepository.findByTypeAndStatusNot(type, TransactionStatus.DONE)
                .stream().filter(t -> t.getStatus() != TransactionStatus.CANCELED)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public InventoryTransaction updateTransactionStatus(Long id, String newStatus) {
        InventoryTransaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        TransactionStatus oldStatus = tx.getStatus();
        TransactionStatus status = TransactionStatus.valueOf(newStatus);
        tx.setStatus(status);

        // If transitioning to DONE, adjust stock
        if (status == TransactionStatus.DONE && oldStatus != TransactionStatus.DONE) {
            if (tx.getType() == TransactionType.RECEIPT) {
                productService.updateStock(tx.getProduct().getId(), tx.getQuantity());
            } else if (tx.getType() == TransactionType.DELIVERY) {
                if (tx.getProduct().getCurrentStock() < tx.getQuantity()) {
                    throw new RuntimeException("Insufficient stock for delivery!");
                }
                productService.updateStock(tx.getProduct().getId(), -tx.getQuantity());
            }
        }

        return transactionRepository.save(tx);
    }
}
