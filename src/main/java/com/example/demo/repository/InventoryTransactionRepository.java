package com.example.demo.repository;

import com.example.demo.model.InventoryTransaction;
import com.example.demo.model.TransactionStatus;
import com.example.demo.model.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {
    List<InventoryTransaction> findByType(TransactionType type);
    List<InventoryTransaction> findByStatus(TransactionStatus status);
    List<InventoryTransaction> findByTypeAndStatusNot(TransactionType type, TransactionStatus status);
}
