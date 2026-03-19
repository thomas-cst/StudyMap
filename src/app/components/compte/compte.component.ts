import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-compte',
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule]
})
export class CompteComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  showSignupForm: boolean = false;
  showLoginForm: boolean = false;
  isConnected: boolean = false;
  currentUser: any = null;
  successMessage: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  signupForm: FormGroup;
  loginForm: FormGroup;
  private wasConnectedBefore: boolean = false; // Track initial state

  constructor(private fb: FormBuilder, private authService: AuthService, private dataService: DataService) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,20}$/)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator.bind(this) });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  ngOnInit() {
    // Attendre que la session Supabase soit chargée, puis vérifier l'état de connexion
    this.authService.ensureSessionLoaded().then(() => {
      this.checkIfConnected();
      this.wasConnectedBefore = this.isConnected; // Mark initial state
    });

    // Écouter les changements d'authentification (pour OAuth et localStorage)
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = { email: user.email, name: user.email?.split('@')[0] };
        this.isConnected = true;
        
        // If we just became connected (and weren't before), show success message
        if (!this.wasConnectedBefore) {
          this.successMessage = 'Connexion réussie !';
          this.errorMessage = '';
          this.showLoginForm = false;
          this.showSignupForm = false;
        }
        this.wasConnectedBefore = true;
      } else {
        this.checkIfConnected();
        this.wasConnectedBefore = this.isConnected;
      }
    });
  }

  checkIfConnected() {
    // Vérifier d'abord dans Supabase
    const supabaseUser = this.authService.getCurrentUser();
    if (supabaseUser) {
      this.currentUser = { email: supabaseUser.email, name: supabaseUser.email?.split('@')[0] };
      this.isConnected = true;
      return;
    }
    
    // Sinon vérifier dans localStorage (pour les inscriptions/connexions normales)
    const localUser = localStorage.getItem('user');
    if (localUser) {
      try {
        this.currentUser = JSON.parse(localUser);
        this.isConnected = true;
      } catch (e) {
        console.error('Erreur parsing user:', e);
        this.isConnected = false;
      }
    } else {
      this.isConnected = false;
    }
  }

  passwordMatchValidator(form: FormGroup): any {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  toggleSignupForm() {
    this.showSignupForm = !this.showSignupForm;
    this.showLoginForm = false;
    this.clearMessages();
  }

  toggleLoginForm() {
    this.showLoginForm = !this.showLoginForm;
    this.showSignupForm = false;
    this.clearMessages();
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  onSignup() {
    if (this.signupForm.valid) {
      this.isLoading = true;
      const { email, password } = this.signupForm.value;

      this.dataService.signup(email, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          localStorage.setItem('user', JSON.stringify(response.user));
          this.successMessage = 'Inscription réussie ! Bienvenue !';
          this.errorMessage = '';
          this.signupForm.reset();
          this.showSignupForm = false;
          // Forcer la vérification de la connexion
          this.checkIfConnected();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error || 'Erreur lors de l\'inscription';
          console.error('Signup error:', err);
        }
      });
    }
  }

  onLogin() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password, rememberMe } = this.loginForm.value;

      this.dataService.login(email, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          localStorage.setItem('user', JSON.stringify(response.user));
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          this.successMessage = 'Connexion réussie !';
          this.errorMessage = '';
          this.loginForm.reset();
          this.showLoginForm = false;
          // Forcer la vérification de la connexion
          this.checkIfConnected();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error || 'Erreur lors de la connexion';
          console.error('Login error:', err);
        }
      });
    }
  }

  logout() {
    localStorage.removeItem('user');
    this.isLoading = true;
    this.authService.logout().then(({ error }) => {
      this.isLoading = false;
      if (!error) {
        this.isConnected = false;
        this.currentUser = null;
        this.showLoginForm = false;
        this.showSignupForm = false;
        this.successMessage = 'Déconnexion réussie';
        this.errorMessage = '';
        this.loginForm.reset();
        this.signupForm.reset();
      } else {
        this.errorMessage = 'Erreur lors de la déconnexion';
      }
    });
  }

  onGoogleLogin() {
    this.isLoading = true;
    this.clearMessages();
    sessionStorage.setItem('oauthLoginPending', 'true');
    this.authService.loginWithGoogle().then(({ error }) => {
      this.isLoading = false;
      if (error) {
        sessionStorage.removeItem('oauthLoginPending');
        this.errorMessage = error.message || 'Erreur lors de la connexion Google';
      }
    });
  }

  close(): void {
    this.closed.emit();
  }
}
