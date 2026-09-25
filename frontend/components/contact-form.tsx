"use client";

import { Check, LoaderCircle, Send } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");

    window.setTimeout(() => {
      setStatus("sent");
    }, 700);
  };

  if (status === "sent") {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center" role="status">
        <span className="flex size-14 items-center justify-center rounded-full bg-grass text-white shadow-lg shadow-green-950/20">
          <Check className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">Your message has been sent.</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
          Thanks for reaching out. This is a preview response for now, but the form is ready to connect to a message service later.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setStatus("idle")}
          className="mt-7 h-11 rounded-full border-slate-300 bg-white/60 px-5 text-slate-800 hover:bg-white"
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7 lg:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-2 block text-xs font-semibold text-slate-700">
            Your name
          </label>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            placeholder="Juan Dela Cruz"
            className="h-12 rounded-xl border-slate-200 bg-white/75 px-4 text-base text-slate-950 placeholder:text-slate-400 focus-visible:border-turquoise focus-visible:ring-turquoise/25 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-2 block text-xs font-semibold text-slate-700">
            Email address
          </label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="h-12 rounded-xl border-slate-200 bg-white/75 px-4 text-base text-slate-950 placeholder:text-slate-400 focus-visible:border-turquoise focus-visible:ring-turquoise/25 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="mb-2 block text-xs font-semibold text-slate-700">
          Subject
        </label>
        <Input
          id="contact-subject"
          name="subject"
          required
          placeholder="How can we help?"
          className="h-12 rounded-xl border-slate-200 bg-white/75 px-4 text-base text-slate-950 placeholder:text-slate-400 focus-visible:border-turquoise focus-visible:ring-turquoise/25 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-2 block text-xs font-semibold text-slate-700">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          placeholder="Tell us what is on your mind..."
          className="w-full resize-y rounded-xl border border-slate-200 bg-white/75 px-4 py-3 text-base text-slate-950 shadow-xs outline-none transition-colors placeholder:text-slate-400 focus:border-turquoise focus:ring-2 focus:ring-turquoise/25 sm:text-sm"
        />
      </div>

      <Button
        type="submit"
        disabled={status === "sending"}
        className="h-12 w-full rounded-xl bg-grass font-semibold text-white shadow-md shadow-green-950/15 hover:bg-grass-hover sm:w-auto sm:px-7"
      >
        {status === "sending" ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Sending...
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden="true" />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}
