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
        formState: { errors },
    } = useForm<FormInputs>();
    const onSubmit = (data: FormInputs) => console.log(data);
    console.log(errors);

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-12 text-base xs:test-lg sm:text-xl font-medium leading-relaxed font-in"
        >
            Hello! My name is{" "}
            <input
                type="text"
                placeholder="your name"
                {...register("name", { required: true, maxLength: 80 })}
                className="outline-none border-0 p-0 mx-2 focus:ring-0 placeholder:text-lg placeholder:text-center border-b border-gray focus:border-gray bg-transparent"
            />
            and I want to discuss a potential project. You can email me at{" "}
            <input
                type="email"
                placeholder="your email"
                {...register("Email", { required: true })}
                className="outline-none border-0 p-0 mx-2 focus:ring-0 placeholder:text-lg placeholder:text-center border-b border-gray focus:border-gray bg-transparent"
            />
            or call me at{" "}
            <input
                type="tel"
                placeholder="your phone"
                {...register}
                className="outline-none border-0 p-0 mx-2 focus:ring-0 placeholder:text-lg placeholder:text-center border-b border-gray focus:border-gray bg-transparent"
            />
            Here are some details about the project: <br />
            <textarea
                {...register("projectDetails", {})}
                placeholder="My project is about..."
                rows={3}
                className="w-full outline-none border-0 p-0 mx-2 focus:ring-0 placeholder:text-lg placeholder:text-center border-b border-gray focus:border-gray bg-transparent"
            />
            <input
                type="submit"
                value="Send Request"
                className="mt-8 font-medium inline-block capitalize text-lg sm:text-xl py-2 sm:py-3 px-6 sm:px-8 border-2 border-solid border-dark dark:border-light rounded cursor-pointer"
            />
        </form>
    );
}
