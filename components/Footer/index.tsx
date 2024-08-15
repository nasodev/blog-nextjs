"use client";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { DribbbleIcon, GithubIcon, LinkedinIcon, TwitterIcon } from "../icons";

const Footer = () => {
  type FormValues = {
    email: string;
  };
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();
  //   const {
  //     register,
  //     handleSubmit,
  //     formState: { errors },
  //   } = useForm();
  const onSubmit = (data: FormValues) => console.log(data);
  //   const onSubmit = handleSubmit((data) => console.log(data));
  console.log(errors);
  return (
    <footer className="mt-16 rounded-2xl bg-dark m-10 flex flex-col items-center text-light">
      <h3 className="mt-16 font-medium text-center capitalize text-4xl px-4">
        Interesting Stories | Updates | Guides
      </h3>
      <p className="mt-5 px-4 text-center w-3/5 font-light text-base">
        Subscribe to learn about new technology and updates. Join over 5000+
        members community to stay up to date with latest news.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 min-w-[385px] flex items-stretch bg-light p-2 rounded mx04"
      >
        {/* <form onSubmit={onSubmit}> */}
        <input
          type="email"
          placeholder="Email"
          {...register("email", { required: true })}
          className="w-full bg-transparent pl-0 text-dark focus:border-dark focus:ring-0 border-0 border-b mr-2 pb-1 rounded mx-4"
        />

        <input
          type="submit"
          className="bg-dark text-light cursor-pointer font-medium rounded px-5 py-1"
        />
      </form>
      <div className="flex items-center mt-8">
        <Link href="http://example.com" className="inline-block w-6 h-6 mr-4">
          <LinkedinIcon className="hover:scale-125 transition-all ease duration-200" />
        </Link>
        <Link href="http://example.com" className="inline-block w-6 h-6 mr-4">
          <TwitterIcon className="hover:scale-125 transition-all ease duration-200" />
        </Link>
        <Link
          href="http://example.com"
          className="inline-block w-6 h-6 mr-4 fill-light"
        >
          <GithubIcon className="hover:scale-125 transition-all ease duration-200" />
        </Link>
        <Link href="http://example.com" className="inline-block w-6 h-6 mr-4">
          <DribbbleIcon className="hover:scale-125 transition-all ease duration-200" />
        </Link>
      </div>
      <div className="w-full mt-24 relative font-medium border-t border-solid border-light py-6 px-8 flex flex-row items-center justify-between">
        <span>&copy;2023 FunDev. All rights reserved.</span>
        <Link href="/sitemap.xml" className="text-center underline">
          sitemap.xml
        </Link>
        <div className="text-center">
          Made with &hearts; by <a href="https://devdreaming.com">codebucks</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
