/**
 * Composant Compte - Popup modale de gestion du compte utilisateur
 * 
 * Fonctionnalites :
 * - Formulaire d'inscription avec validation (email, mot de passe securise)
 * - Formulaire de connexion avec option "rester connecte"
 * - Connexion via Google OAuth
 * - Deconnexion
 * - Verification automatique de la session au chargement
 */
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-compte',
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule]
})
export class CompteComponent implements OnInit {
  /** Evenement emis pour fermer la popup depuis le composant parent */
  @Output() closed = new EventEmitter<void>();

  /** Controle l'affichage du formulaire d'inscription */
  showSignupForm: boolean = false;
  /** Controle l'affichage du formulaire de connexion */
  showLoginForm: boolean = false;
  /** Indique si l'utilisateur est actuellement connecte */
  isConnected: boolean = false;
  /** Donnees de l'utilisateur connecte (email, nom) */
  currentUser: any = null;
  /** Message de succes affiche apres une action reussie */
  successMessage: string = '';
  /** Message d'erreur affiche en cas de probleme */
  errorMessage: string = '';
  /** Indicateur de chargement (pendant les appels API) */
  isLoading: boolean = false;
  /** Formulaire reactif d'inscription avec validateurs */
  signupForm: FormGroup;
  /** Formulaire reactif de connexion */
  loginForm: FormGroup;

  /** Empêche l'affichage du message de succès au chargement si déjà connecté */
  private wasConnectedBefore: boolean = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {
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

  /** Verifie l'etat de connexion : d'abord Supabase, puis localStorage en fallback */
  checkIfConnected() {
    // Verifier d'abord dans Supabase
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

  /** Validateur personnalise : verifie que les deux mots de passe correspondent */
  passwordMatchValidator(form: FormGroup): any {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  /** Affiche ou masque le formulaire d'inscription (et masque la connexion) */
  toggleSignupForm() {
    this.showSignupForm = !this.showSignupForm;
    this.showLoginForm = false;
    this.clearMessages();
  }

  /** Affiche ou masque le formulaire de connexion (et masque l'inscription) */
  toggleLoginForm() {
    this.showLoginForm = !this.showLoginForm;
    this.showSignupForm = false;
    this.clearMessages();
  }

  /** Efface les messages de succes et d'erreur */
  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  /** Soumission du formulaire d'inscription */
  async onSignup() {
    if (this.signupForm.valid) {
      this.isLoading = true;
      const { email, password } = this.signupForm.value;

      const { user, error } = await this.authService.signUp(email, password);
      this.isLoading = false;

      if (error) {
        this.errorMessage = error.message || 'Erreur lors de l\'inscription';
        console.error('Signup error:', error);
        return;
      }

      this.successMessage = 'Inscription réussie ! Vérifiez votre email pour confirmer.';
      this.errorMessage = '';
      this.signupForm.reset();
      this.showSignupForm = false;
      this.checkIfConnected();
      setTimeout(() => this.close(), 1500);
    }
  }
  /** Soumission du formulaire de connexion */
  async onLogin() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password, rememberMe } = this.loginForm.value;

      const { user, error } = await this.authService.signIn(email, password);
      this.isLoading = false;

      if (error) {
        this.errorMessage = error.message || 'Erreur lors de la connexion';
        console.error('Login error:', error);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      this.successMessage = 'Connexion réussie !';
      this.errorMessage = '';
      this.loginForm.reset();
      this.showLoginForm = false;
      this.checkIfConnected();
      setTimeout(() => this.close(), 1500);
    }
  }

  /** Déconnexion de l'utilisateur (localStorage + Supabase) */
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

  /** Connexion via Google OAuth (redirige vers Google) */
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

  /** Ferme la popup en emettant l'evenement vers le parent */
  close(): void {
    this.closed.emit();
  }
}
