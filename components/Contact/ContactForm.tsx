"use client";

import React from "react";
import { useForm } from "react-hook-form";

type FormInputs = {
    name: string;
    Email: string;
    phone?: string;
    projectDetails?: string;
};

export default function App() {
    const {
        register,
        handleSubmit,
        formState: { isSubmitting },
    } = useForm<FormInputs>();
    const onSubmit = (data: FormInputs) => console.log(data);

    const inputClassName =
        "outline-none border-0 p-0 mx-2 focus:ring-0 border-b border-gray focus-visible:border-accent dark:focus-visible:border-accentDark placeholder:text-lg placeholder:text-center bg-transparent";

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-12 text-base xs:text-lg sm:text-xl font-medium leading-relaxed font-in"
        >
            Hello! My name is{" "}
            <input
                type="text"
                placeholder="your name…"
                autoComplete="name"
                aria-label="이름"
                {...register("name", { required: true, maxLength: 80 })}
                className={inputClassName}
            />
            and I want to discuss a potential project. You can email me at{" "}
            <input
                type="email"
                placeholder="your email…"
                autoComplete="email"
                aria-label="이메일"
                spellCheck={false}
                {...register("Email", { required: true })}
                className={inputClassName}
            />
            or call me at{" "}
            <input
                type="tel"
                placeholder="your phone…"
                autoComplete="tel"
                aria-label="전화번호"
                {...register("phone")}
                className={inputClassName}
            />
            Here are some details about the project: <br />
            <textarea
                {...register("projectDetails", {})}
                placeholder="My project is about…"
                aria-label="프로젝트 상세"
                rows={3}
                className={`w-full ${inputClassName}`}
            />
            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-8 font-medium inline-block capitalize text-lg sm:text-xl py-2 sm:py-3 px-6 sm:px-8 border-2 border-solid border-dark dark:border-light rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? "Sending…" : "Send Request"}
            </button>
        </form>
    );
}
