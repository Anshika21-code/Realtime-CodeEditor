import React, {useState} from 'react'
import { v4 as uuid } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';


const Home = () => {

  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuid();
    setRoomId(id);
    toast.success("New room created");  
  }

  const joinRoom = (e) => {
    e.preventDefault();
    if (!roomId || !username) {
      toast.error("Room ID and username are required");
      return;
    }
    navigate(`/editor/${roomId}`, { state: { username } });
  }

  const handleInputEnter = (e) => {
    if (e.key === "Enter") {
      joinRoom(e);
    }
  };

  return (
    <div className="homePageWrapper">
      <div className='formwrapper'>
        <img className='homePageLogo' src="code-sync.png" alt="code-sync-logo" />
        <h4 className='mainLabel'>Paste invitation ROOM ID</h4>

        <div className='inputGroup'>
          <input 
          type="text" 
          className='inputBox' 
          placeholder="Enter ROOM ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyUp={handleInputEnter}
           />
          
          <input 
          type="text" 
          className='inputBox'  
          placeholder="USERNAME" 
          value={username}
          onChange={(e) => setUsername(e.target.value)} 
          onKeyUp={handleInputEnter}
          />

          <button className='btn joinBtn' onClick={joinRoom}>Join Room</button>
          <span className='createInfo'>
            If you don't have an invite then, create &nbsp;
            <a onClick={createNewRoom} href="/" className='createNewBtn'>new room</a>
          </span>
        </div>

      </div>
      <footer className='footer'>
        <h4>Build with 🌱 by <a href="https://github.com/Anshika21-code">Anshika21-code</a></h4>
      </footer>
    </div>
  )
}

export default Home
