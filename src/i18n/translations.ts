export type Language = 'en' | 'sv';

export const translations = {
  sv: {
    navigation: {
      home: 'Rutter',
      map: 'Karta',
      profile: 'Profil'
    },
    // Auth screens
    auth: {
      signIn: {
        title: 'Dags att hitta en ny övningsrutt',
        slogan: 'Upptäck perfekta övningskörningsrutter nära dig. Filtrera efter svårighetsgrad, längd och mer',
        emailLabel: 'E-post',
        emailPlaceholder: 'Din e-postadress',
        passwordLabel: 'Lösenord',
        passwordPlaceholder: 'Ditt lösenord',
        signInButton: 'Logga in',
        loading: 'Loggar in...',
        forgotPassword: 'Glömt lösenord?',
        noAccount: 'Har du inget konto?',
        signUpLink: 'Skapa konto',
        error: {
          emptyFields: 'Vänligen fyll i alla fält',
        },
        readMore: 'Läs mer om Vromm',
        helpImprove: 'Hjälp oss förbättra körkortsutbildningen',
        forLearners: 'För elever',
        forSchools: 'För trafikskolor'
      },
      signUp: {
        title: 'Skapa konto',
        subtitle: 'Registrera dig för att börja skapa och dela rutter',
        emailLabel: 'E-post',
        emailPlaceholder: 'Din e-postadress',
        passwordLabel: 'Lösenord',
        passwordPlaceholder: 'Välj ett lösenord',
        confirmPasswordLabel: 'Bekräfta lösenord',
        confirmPasswordPlaceholder: 'Bekräfta ditt lösenord',
        signUpButton: 'Skapa konto',
        loading: 'Skapar konto...',
        hasAccount: 'Har du redan ett konto?',
        signInLink: 'Logga in',
        error: {
          emptyFields: 'Vänligen fyll i alla fält',
          passwordMismatch: 'Lösenorden matchar inte',
        },
      },
      resetPassword: {
        title: 'Återställ lösenord',
        subtitle: 'Ange din e-postadress så skickar vi instruktioner för att återställa ditt lösenord',
        emailLabel: 'E-post',
        emailPlaceholder: 'Din e-postadress',
        resetButton: 'Återställ lösenord',
        loading: 'Skickar...',
        backToLogin: 'Tillbaka till inloggning',
        success: 'Instruktioner har skickats till din e-post',
        error: {
          emptyEmail: 'Vänligen ange din e-postadress',
        },
      },
    },
    // Settings
    settings: {
      language: {
        title: 'Språk',
        swedish: 'Svenska',
        english: 'Engelska'
      }
    },
    // Common
    common: {
      error: 'Ett fel uppstod',
      loading: 'Laddar...',
      save: 'Spara',
      cancel: 'Avbryt',
      delete: 'Radera',
      edit: 'Redigera',
      back: 'Tillbaka'
    }
  },
  en: {
    navigation: {
      home: 'Routes',
      map: 'Map',
      profile: 'Profile'
    },
    // Auth screens
    auth: {
      signIn: {
        title: 'Time to find a new exercise route',
        slogan: 'Discover perfect practice driving routes near you. Filter by difficulty, length and more',
        emailLabel: 'Email',
        emailPlaceholder: 'Your email address',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Your password',
        signInButton: 'Sign In',
        loading: 'Signing in...',
        forgotPassword: 'Forgot Password?',
        noAccount: "Don't have an account?",
        signUpLink: 'Create Account',
        error: {
          emptyFields: 'Please fill in all fields',
        },
        readMore: 'Read more about Vromm',
        helpImprove: 'Help Us Improve Driver Training',
        forLearners: 'For Learners',
        forSchools: 'For Schools'
      },
      signUp: {
        title: 'Create Account',
        subtitle: 'Sign up to start creating and sharing routes',
        emailLabel: 'Email',
        emailPlaceholder: 'Your email address',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Choose a password',
        confirmPasswordLabel: 'Confirm Password',
        confirmPasswordPlaceholder: 'Confirm your password',
        signUpButton: 'Create Account',
        loading: 'Creating Account...',
        hasAccount: 'Already have an account?',
        signInLink: 'Sign In',
        error: {
          emptyFields: 'Please fill in all fields',
          passwordMismatch: 'Passwords do not match',
        },
      },
      resetPassword: {
        title: 'Reset Password',
        subtitle: 'Enter your email address and we will send you instructions to reset your password',
        emailLabel: 'Email',
        emailPlaceholder: 'Your email address',
        resetButton: 'Reset Password',
        loading: 'Sending...',
        backToLogin: 'Back to Login',
        success: 'Instructions have been sent to your email',
        error: {
          emptyEmail: 'Please enter your email address',
        },
      },
    },
    // Settings
    settings: {
      language: {
        title: 'Language',
        swedish: 'Swedish',
        english: 'English'
      }
    },
    // Common
    common: {
      error: 'An error occurred',
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back'
    }
  }
} as const; 