package com.example.demo.controller;

import com.example.demo.dto.JwtResponse;
import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.MessageResponse;
import com.example.demo.dto.SignupRequest;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtUtils;
import com.example.demo.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.example.demo.service.EmailService;
import com.example.demo.dto.OtpRequest;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    EmailService emailService;

    // Temporary in-memory OTP storage: Map<EmailOrPhone, OTP>
    private final Map<String, String> otpStorage = new ConcurrentHashMap<>();
    private final Random random = new Random();

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // Safe fetch of role
        String roleStr = userDetails.getAuthorities().stream()
                .findFirst().map(item -> item.getAuthority())
                .orElse("ROLE_STAFF").replace("ROLE_", "");

        return ResponseEntity.ok(new JwtResponse(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                roleStr));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        Role role = signUpRequest.getRole() != null ? signUpRequest.getRole() : Role.STAFF;

        User user = new User(signUpRequest.getUsername(),
                encoder.encode(signUpRequest.getPassword()),
                role,
                signUpRequest.getFullName(),
                signUpRequest.getPhone(),
                signUpRequest.getEmail());

        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody OtpRequest request) {
        String identifier = request.getIdentifier(); // Can be email or phone
        
        // Generate 4-digit OTP
        String otp = String.format("%04d", random.nextInt(10000));
        otpStorage.put(identifier, otp);

        // Ideally we check if it is an email or phone and use the right service.
        // For hackathon: we just use email service
        if(identifier.contains("@")) {
            emailService.sendEmail(identifier, "Inventify Verification Code", "Your OTP is: " + otp);
        } else {
            // For phone, print to console as fallback if real SMS isn't configured
            System.out.println("Mock SMS to " + identifier + ": Your OTP is: " + otp);
        }
        
        return ResponseEntity.ok(new MessageResponse("OTP Sent Successfully"));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody OtpRequest request) {
        String identifier = request.getIdentifier();
        String providedOtp = request.getOtp();

        if (otpStorage.containsKey(identifier) && otpStorage.get(identifier).equals(providedOtp)) {
            otpStorage.remove(identifier); // Clear it after correct usage
            return ResponseEntity.ok(new MessageResponse("OTP Verified"));
        }
        
        return ResponseEntity.badRequest().body(new MessageResponse("Invalid OTP"));
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            String username = jwtUtils.getUserNameFromJwtToken(token);
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Map<String, Object> profile = new java.util.HashMap<>();
            profile.put("username", user.getUsername());
            profile.put("fullName", user.getFullName());
            profile.put("email", user.getEmail());
            profile.put("phone", user.getPhone());
            profile.put("role", user.getRole().name());

            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Could not fetch profile"));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Missing fields"));
        }

        String storedOtp = otpStorage.get(email);
        if (storedOtp == null || !storedOtp.equals(otp)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid OTP"));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("No account found with this email"));
        }

        user.setPassword(encoder.encode(newPassword));
        userRepository.save(user);
        otpStorage.remove(email);

        return ResponseEntity.ok(new MessageResponse("Password reset successful!"));
    }
}
