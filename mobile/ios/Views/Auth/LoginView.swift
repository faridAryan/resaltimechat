import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showingRegister = false

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Logo and Title
                VStack(spacing: 10) {
                    Image(systemName: "globe")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)

                    Text("Learno")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Master any language with AI")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .padding(.top, 50)

                Spacer()

                // Login Form
                VStack(spacing: 15) {
                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)

                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())

                    if let errorMessage = authViewModel.errorMessage {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }

                    Button(action: {
                        authViewModel.login(email: email, password: password)
                    }) {
                        if authViewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Log In")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    .disabled(authViewModel.isLoading || email.isEmpty || password.isEmpty)

                    Button(action: {
                        showingRegister = true
                    }) {
                        Text("Don't have an account? Sign Up")
                            .foregroundColor(.blue)
                    }
                }
                .padding(.horizontal, 30)

                Spacer()
            }
            .sheet(isPresented: $showingRegister) {
                RegisterView()
                    .environmentObject(authViewModel)
            }
        }
    }
}
