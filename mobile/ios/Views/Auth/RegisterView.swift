import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var username = ""
    @State private var nativeLanguage = "english"
    @State private var selectedLanguages: Set<String> = []

    let languages = Config.supportedLanguages

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Account Information")) {
                    TextField("Username", text: $username)
                        .autocapitalization(.none)

                    TextField("Email", text: $email)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)

                    SecureField("Password", text: $password)
                }

                Section(header: Text("Language Preferences")) {
                    Picker("Native Language", selection: $nativeLanguage) {
                        ForEach(languages, id: \.self) { language in
                            Text(language.capitalized).tag(language)
                        }
                    }

                    VStack(alignment: .leading) {
                        Text("Learning Languages")
                            .font(.caption)
                            .foregroundColor(.gray)

                        ForEach(languages.filter { $0 != nativeLanguage }, id: \.self) { language in
                            Button(action: {
                                if selectedLanguages.contains(language) {
                                    selectedLanguages.remove(language)
                                } else {
                                    selectedLanguages.insert(language)
                                }
                            }) {
                                HStack {
                                    Text(language.capitalized)
                                    Spacer()
                                    if selectedLanguages.contains(language) {
                                        Image(systemName: "checkmark")
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                            .foregroundColor(.primary)
                        }
                    }
                }

                if let errorMessage = authViewModel.errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button(action: {
                        authViewModel.register(
                            email: email,
                            password: password,
                            username: username,
                            nativeLanguage: nativeLanguage,
                            targetLanguages: Array(selectedLanguages)
                        )
                    }) {
                        if authViewModel.isLoading {
                            HStack {
                                Spacer()
                                ProgressView()
                                Spacer()
                            }
                        } else {
                            Text("Create Account")
                                .frame(maxWidth: .infinity)
                                .foregroundColor(.blue)
                        }
                    }
                    .disabled(authViewModel.isLoading || email.isEmpty || password.isEmpty || username.isEmpty || selectedLanguages.isEmpty)
                }
            }
            .navigationTitle("Sign Up")
            .navigationBarItems(leading: Button("Cancel") {
                dismiss()
            })
        }
    }
}
