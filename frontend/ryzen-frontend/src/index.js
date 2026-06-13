setTimeout(() => {
  async function nodeFetch() {

    try {
      let response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      let text = await response.json();
      console.log(text);
      done = true;
    } catch (error) {
      console.log(error);
    }
  }

}, 1000);
