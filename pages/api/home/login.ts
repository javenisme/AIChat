// write login page using next-auth.js framework. login provider should be include google and email

import { signIn } from "next-auth/react"
import { GoogleIcon } from "@heroicons/react/outline"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    signIn("credentials", {
      email,
      password,
      redirect: false,
    })
  }

  return (
    <div>
      <h2>Login</h2>
      <button
        onClick={() => signIn("google", { callbackUrl: "http://localhost:3000/dashboard" })}
        className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow mx-2 flex"
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Sign in with Google
      </button>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded">
          Sign In
        </button>
      </form>
    </div>
  )
}
