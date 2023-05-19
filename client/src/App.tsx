import { useEffect, useState } from 'react';
import './App.css';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
});


type annoSchema = {
  'date' : String,
  'title' : String,
  'message' : String,
  'links' : [String],
   'author' : {
     id : {
         type : number,
         ref: "User" //same as the 1st param in mongoose.model() used in userschema
       },
      username: String
 }
};


function App() {

  const  [data,setData] = useState<Array<annoSchema>>([]);

  useEffect(()=>{
    api.get('/').then(res => {
      console.log("backend data=");
      console.log(res.data);
      console.log(typeof res.data);
      setData(res?.data?? []);
      console.log(data);
    }).catch(err => {
      console.error(err);
    });
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <ul>
            {data?.length > 0 && data?.map((d,i) => {return <li key={i}>{d.title}</li>;} )}
        </ul>
      </header>
    </div>
  );
}

export default App;
