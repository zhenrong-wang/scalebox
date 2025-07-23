package services

import (
	"fmt"

	"scalebox-backend/internal/config"
)

type EmailService struct {
	config config.SMTPConfig
}

func NewEmailService(cfg config.SMTPConfig) *EmailService {
	return &EmailService{
		config: cfg,
	}
}

func (e *EmailService) SendVerificationEmail(email, username, verificationCode string) error {
	subject := "Verify Your ScaleBox Account"
	body := fmt.Sprintf(`
		<h2>Welcome to ScaleBox!</h2>
		<p>Hello %s,</p>
		<p>Thank you for signing up for ScaleBox. Please use the following verification code to complete your registration:</p>
		<h3 style="background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px;">%s</h3>
		<p>This code will expire in 24 hours.</p>
		<p>If you didn't create this account, please ignore this email.</p>
		<p>Best regards,<br>The ScaleBox Team</p>
	`, username, verificationCode)

	return e.sendEmail(email, subject, body)
}

func (e *EmailService) SendPasswordResetEmail(email, resetToken string) error {
	subject := "Reset Your ScaleBox Password"
	body := fmt.Sprintf(`
		<h2>Password Reset Request</h2>
		<p>Hello,</p>
		<p>You have requested to reset your ScaleBox password. Please use the following token to complete the reset:</p>
		<h3 style="background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 18px; font-family: monospace;">%s</h3>
		<p>This token will expire in 1 hour.</p>
		<p>If you didn't request this reset, please ignore this email.</p>
		<p>Best regards,<br>The ScaleBox Team</p>
	`, resetToken)

	return e.sendEmail(email, subject, body)
}

func (e *EmailService) SendEmailChangeConfirmation(email, confirmationToken, currentEmail, newEmail string) error {
	subject := "Confirm Email Change - ScaleBox"
	body := fmt.Sprintf(`
		<h2>Email Change Confirmation</h2>
		<p>Hello,</p>
		<p>A request has been made to change your ScaleBox account email from <strong>%s</strong> to <strong>%s</strong>.</p>
		<p>Please click the following link to confirm this change:</p>
		<p><a href="%s/confirm-email-change?token=%s" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Confirm Email Change</a></p>
		<p>Or copy and paste this URL into your browser:</p>
		<p style="background-color: #f0f0f0; padding: 10px; font-family: monospace;">%s/confirm-email-change?token=%s</p>
		<p>This confirmation link will expire in 30 minutes.</p>
		<p>If you didn't request this change, please ignore this email.</p>
		<p>Best regards,<br>The ScaleBox Team</p>
	`, currentEmail, newEmail, e.config.From, confirmationToken, e.config.From, confirmationToken)

	return e.sendEmail(email, subject, body)
}

func (e *EmailService) SendWelcomeEmail(email, displayName string) error {
	subject := "Welcome to ScaleBox!"
	body := fmt.Sprintf(`
		<h2>Welcome to ScaleBox! 🎉</h2>
		<p>Hello %s,</p>
		<p>Your ScaleBox account has been successfully created and verified!</p>
		<p>You can now:</p>
		<ul>
			<li>Create and manage projects</li>
			<li>Launch development sandboxes</li>
			<li>Collaborate with your team</li>
			<li>Access powerful development tools</li>
		</ul>
		<p>Get started by visiting your dashboard and creating your first project.</p>
		<p>If you have any questions, feel free to reach out to our support team.</p>
		<p>Best regards,<br>The ScaleBox Team</p>
	`, displayName)

	return e.sendEmail(email, subject, body)
}

func (e *EmailService) SendUserCreationEmail(email, username, displayName, initialPassword, dedicatedSigninURL string) error {
	subject := "Your ScaleBox Account Has Been Created"
	body := fmt.Sprintf(`
		<h2>Welcome to ScaleBox! 🎉</h2>
		<p>Hello %s,</p>
		<p>Your ScaleBox account has been created by your administrator. Here are your login credentials:</p>
		
		<h3>Login Information:</h3>
		<p><strong>Username:</strong> %s</p>
		<p><strong>Initial Password:</strong> %s</p>
		<p><strong>Dedicated Signin URL:</strong> <a href="%s">%s</a></p>
		
		<h3>How to Sign In:</h3>
		<p>You can sign in using either:</p>
		<ol>
			<li><strong>Dedicated URL:</strong> Click the link above or visit: %s</li>
			<li><strong>Regular Login:</strong> Use your username and password on the main login page</li>
		</ol>
		
		<p><strong>Important:</strong> Please change your password after your first login for security.</p>
		
		<p>If you have any questions, please contact your administrator.</p>
		<p>Best regards,<br>The ScaleBox Team</p>
	`, displayName, username, initialPassword, dedicatedSigninURL, dedicatedSigninURL, dedicatedSigninURL)

	return e.sendEmail(email, subject, body)
}

func (e *EmailService) SendUserDeletionNotification(rootUserEmail, rootUserName, deletedUserName, deletedUserEmail string, deletedProjectsCount int) error {
	subject := "User Deletion Notification - ScaleBox"

	projectsInfo := ""
	if deletedProjectsCount > 0 {
		projectsInfo = fmt.Sprintf(`
		<p><strong>Additional Actions:</strong></p>
		<ul>
			<li>Deleted %d empty project(s) owned by the user</li>
		</ul>`, deletedProjectsCount)
	}

	body := fmt.Sprintf(`
		<h2>User Deletion Notification</h2>
		<p>Hello %s,</p>
		<p>This is to confirm that a user has been successfully deleted from your ScaleBox account.</p>
		
		<h3>Deleted User Details:</h3>
		<ul>
			<li><strong>Name:</strong> %s</li>
			<li><strong>Email:</strong> %s</li>
		</ul>
		
		<h3>What was removed:</h3>
		<ul>
			<li>User account and all associated data</li>
			<li>All user notifications</li>
			<li>User's dedicated signin URL</li>%s
		</ul>
		
		<p><strong>Important:</strong> This action cannot be undone. The user will no longer be able to access the system.</p>
		
		<p>If you did not authorize this deletion or have any questions, please contact support immediately.</p>
		<p>Best regards,<br>The ScaleBox Team</p>
	`, rootUserName, deletedUserName, deletedUserEmail, projectsInfo)

	return e.sendEmail(rootUserEmail, subject, body)
}

func (e *EmailService) sendEmail(to, subject, body string) error {
	// For now, just print the email (remove in production)
	fmt.Printf("=== EMAIL TO: %s ===\n", to)
	fmt.Printf("Subject: %s\n", subject)
	fmt.Printf("Body: %s\n", body)
	fmt.Println("========================")

	// TODO: Implement actual SMTP sending
	// auth := smtp.PlainAuth("", e.config.User, e.config.Password, e.config.Host)
	// mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	// msg := fmt.Sprintf("Subject: %s\n%s%s", subject, mime, body)
	// addr := fmt.Sprintf("%s:%d", e.config.Host, e.config.Port)
	// return smtp.SendMail(addr, auth, e.config.From, []string{to}, []byte(msg))

	return nil
}
