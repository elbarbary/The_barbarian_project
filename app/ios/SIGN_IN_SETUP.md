# Sign-in provider setup (one-time)

Guest mode works out of the box. Apple and Google each need a small amount of
provider configuration that only the account owner can do. The app is already
wired for both — these steps turn the buttons on.

Bundle id: `com.thebarbarianproject.barbarian`

---

## Sign in with Apple

The entitlement is already in the repo (`ios/Runner/Runner.entitlements`,
referenced by `CODE_SIGN_ENTITLEMENTS` in the three Runner build configs). Two
things remain, both in your Apple Developer account:

1. **Enable the capability on the App ID.** Easiest path: open
   `ios/Runner.xcworkspace` in Xcode → Runner target → **Signing & Capabilities**
   → **+ Capability** → **Sign in with Apple**. Xcode registers it on the App ID
   for you. (If it is already listed there because the entitlement file exists,
   just confirm it shows no error.)
2. That's it — Apple sign-in returns a stable user id with no backend. On the
   simulator it needs an iOS 13+ device signed into an Apple ID (Settings → Sign
   in).

## Sign in with Google

`google_sign_in` is in `pubspec.yaml`. It needs an **iOS OAuth client id** from
Google:

1. In the [Google Cloud console](https://console.cloud.google.com/) → **APIs &
   Services → Credentials** → **Create credentials → OAuth client ID → iOS**,
   with the bundle id above. (If you use Firebase, adding an iOS app there
   creates the same client and a `GoogleService-Info.plist`.)
2. Add the client id to `ios/Runner/Info.plist`:
   ```xml
   <key>GIDClientID</key>
   <string>YOUR_CLIENT_ID.apps.googleusercontent.com</string>
   ```
3. Add the **reversed** client id as a URL scheme, so Google can call back:
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>com.googleusercontent.apps.YOUR_CLIENT_ID</string>
       </array>
     </dict>
   </array>
   ```

Until the Google client id is present the Google button shows a generic
"couldn't sign in" message; Apple and guest are unaffected. Nothing here sends
data to a server — both providers return an identity the app uses only to
namespace the on-device watchlist and to switch on the live feed.
