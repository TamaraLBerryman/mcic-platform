/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,mdx}",
        "./components/**/*.{js,jsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                founders: "#FFE600",
            },
        },
    },
    plugins: [],
};