import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-compte',
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class CompteComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  showSignupForm: boolean = false;
  showLoginForm: boolean = false;
  isConnected: boolean = false;
  currentUser: any = null;
  successMessage: string = '';
  errorMessage: string = '';
  signupForm: FormGroup;
  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private dataService: DataService) {
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
    this.checkIfConnected();
  }

  private handleGoogleToken(token: string) {
    this.dataService.googleLogin(token).subscribe(
      (response: any) => {
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUser = response.user;
        this.isConnected = true;
        this.successMessage = 'Connexion Google réussie !';
        this.errorMessage = '';
        setTimeout(() => {
          this.close();
        }, 1500);
      },
      (error: any) => {
        this.errorMessage = error.error?.error || 'Erreur lors de la connexion Google';
        this.successMessage = '';
        console.error('Erreur serveur:', error);
      }
    );
  }

  checkIfConnected() {
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUser = JSON.parse(user);
      this.isConnected = true;
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
      const { email, password } = this.signupForm.value;
      this.dataService.signup(email, password).subscribe(
        (response: any) => {
          // Sauvegarder l'utilisateur et le connecter automatiquement
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUser = response.user;
          this.isConnected = true;
          this.successMessage = 'Inscription réussie ! Bienvenue !';
          this.errorMessage = '';
          this.signupForm.reset();
          setTimeout(() => {
            this.close();
          }, 1500);
        },
        (error: any) => {
          this.errorMessage = error.error?.error || 'Erreur lors de l\'inscription';
          this.successMessage = '';
        }
      );
    }
  }

  onLogin() {
    if (this.loginForm.valid) {
      const { email, password, rememberMe } = this.loginForm.value;
      this.dataService.login(email, password).subscribe(
        (response: any) => {
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUser = response.user;
          this.isConnected = true;
          this.successMessage = 'Connexion réussie !';
          this.errorMessage = '';
          this.loginForm.reset();
          setTimeout(() => {
            this.close();
          }, 1500);
        },
        (error: any) => {
          this.errorMessage = error.error?.error || 'Email ou mot de passe incorrect';
          this.successMessage = '';
        }
      );
    }
  }

  logout() {
    localStorage.removeItem('user');
    this.isConnected = false;
    this.currentUser = null;
    this.successMessage = 'Déconnexion réussie';
    this.errorMessage = '';
    this.loginForm.reset();
    this.signupForm.reset();
    setTimeout(() => {
      this.close();
    }, 1500);
  }

  onGoogleLogin() {
    this.clearMessages();
    if ((window as any).google) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: '897272620325-ibvmg49op2gr8cu0g8vd45e9shp2ea5a.apps.googleusercontent.com',
          callback: (response: any) => {
            console.log('Google token received');
            if (response.credential) {
              this.handleGoogleToken(response.credential);
            }
          }
        });
        
        (window as any).google.accounts.id.prompt((notification: any) => {
          console.log('Google prompt notified:', notification);
        });
      } catch (error) {
        console.error('Erreur lors du lancement de Google Sign In:', error);
        this.errorMessage = 'Erreur lors de la connexion Google. Verifiez que le Client ID est correct.';
      }
    } else {
      this.errorMessage = 'Google Identity Services n\'est pas disponible. Veuillez actualiser la page.';
    }
  }

  close(): void {
    this.closed.emit();
  }
}
