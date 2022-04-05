import Socrates from './index.mjs';

//init Socrates
const socrates = new Socrates({
    // intercept: true,
    verbose: true,
});

//starting server on port 8080
socrates.listen(8080, '0.0.0.0', function() {
    console.log('TCP-Proxy-Server started!', socrates.address());
});
