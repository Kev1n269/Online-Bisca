const {createApp, ref} = Vue;

const socket=io("http://localhost:8080")

const app=createApp({
    delimiters: ['[[', ']]'],
    setup() {

    }
});

app.mount('#app');

