# Core Inventory Management System (IMS)

A modern, full-stack inventory management system built with Spring Boot, MySQL, and a responsive web frontend. This project provides a robust platform for managing warehouse operations, tracking products, and monitoring stock levels in real-time.

## 🚀 Features

- **Inventory Dashboard**: Real-time KPIs for total products, low stock alerts, and pending operations.
- **Product Management**: Track technical specifications, SKU, category, and warehouse location for every item.
- **Transaction History**: Comprehensive log of all receipts, deliveries, transfers, and adjustments.
- **Multi-Location Support**: Manage inventory across different warehouse zones and bins.
- **Secure Authentication**: JWT-based security with role-based access control (Manager/Staff).
- **Automated Alerts**: Email notifications for verification codes and critical updates.

## 🛠 Tech Stack

- **Backend**: Java 21, Spring Boot 3.4.1
- **Persistence**: Spring Data JPA (Hibernate), MySQL
- **Security**: Spring Security, JSON Web Token (JWT)
- **Email**: Spring Mail / Gmail SMTP integration
- **Building**: Gradle 8.12

## ⚙️ Configuration

The application uses `src/main/resources/application.properties` for configuration. Key properties include:

- `spring.datasource.url`: MySQL connection string.
- `app.jwtSecret`: Secret key for JWT signing.
- `spring.mail.*`: SMTP configuration for email services.

## 📥 Setup & Running

### Prerequisites
- **Java 21**: This project specifically requires JDK 21.
- **MySQL**: Ensure a MySQL instance is running and the `ims` database exists (or will be auto-created).

### Running the Project
The project uses a bundled JDK to ensure compatibility. To run the application:

```powershell
# Set local JAVA_HOME to the project's JDK folder
$env:JAVA_HOME = "jdk-21"
# Run using the Gradle wrapper
.\gradlew bootRun
```

The application will be available at `http://localhost:8080`.

## 📂 Project Structure

- `src/main/java`: Backend source code (Controllers, Models, Services, Repositories).
- `src/main/resources`: Configuration and static frontend assets (HTML, CSS, JS).
- `gradle.properties`: Project-level build settings.

## 👥 Contributors

- **Author**: Manav Parikh
- **Project Name**: Core Inventory Manager
