package com.example.demo.dto;

public class OtpRequest {
    private String identifier; // phone or email
    private String otp;

    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
}
