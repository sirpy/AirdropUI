import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, {useState, useEffect, useRef} from 'react';

import SwitchAndConnectButton from '../../lib/switchConnectButton.js';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorHandler from './ErrorHandler.js';
import {getClaimStatus} from '../../lib/connect.serv.js';

const stateChainIds = {
  fuse: 1,
  rootState: 122
}

export default function Switch(props) {
  const [providerInstance, setProviderInstance] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [connectedChain, setConnectedChain] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [query, setQuery] = useState({status: null});
  const [error, setError] = useState({status: null, code: null});
  const [isClaimed, setIsClaimed] = useState({fuse: false, rootState: false});
  const [isMob, setIsMobile] = useState(null);

  const connectedAddressRef = useRef(connectedAddress);
  const connectedChainRef = useRef(connectedChain);
  const chainIdRef = useRef(chainId);

  useEffect(() => {
    chainIdRef.current = chainId;
  }, [chainId]);

  useEffect(() => {
    connectedAddressRef.current = connectedAddress;
  }, [connectedAddress]);

  useEffect(() => {
    connectedChainRef.current = connectedChain;
  }, [connectedChain]);

  useEffect(() => {
    setIsMobile(props.isMobile);
    if (props.currentConnection){
      setProviderInstance(props.currentConnection.providerInstance);
      setConnectedAddress(props.currentConnection.connectedAddress);
      setChainId(props.currentConnection.chainId);
      if (props.currentConnection.connectedChain == 'unsupported'){
        wrongNetwork();
      } else {
        setQuery({status: null});
        setError({status: null, code: null});
        setConnectedChain(props.currentConnection.connectedChain);
        alreadyClaimed(props.currentConnection);
      }
    }
  }, [props]);

  const alreadyClaimed = async(currentConnection) => {
    setQuery({status: 'get-claim-status'});
    const claimStatus = getClaimStatus(currentConnection);
    claimStatus.then((res) => {
      setIsClaimed(res);
      for (const [stateId, status] of Object.entries(res)){
        if (status && currentConnection.chainId == stateChainIds[stateId]){
          setError({status: 'alreadyClaimed', code: 318});
          setQuery({status: 'error'});
          break;
        } else {
          setQuery({status: 'idle'});
        }
      }
    });
  }

  const addFuseNetwork = async(id) => {
    setQuery({status: "loading-connect", code: null});
    providerInstance.eth.currentProvider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: id,
        chainName: 'Fuse Mainnet',
        nativeCurrency: {
          name: 'Fuse',
          symbol: 'FUSE',
          decimals: 18
        },
          rpcUrls: ['https://rpc.fuse.io'],
          blockExplorerUrls: ['https://explorer.fuse.io']
        }],
    }).catch((err) => {
        setQuery({status: 'error'});
        setError({status: '', code: err.code});
    });
  }

  // Switching of network by button
  const switchNetwork = async (chainId, stateId) => {
    if (!isClaimed[stateId]){
      await providerInstance.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainId}]
      }).catch((err) => {
        console.log('err switch -->', err);
        if (err.code == 4902){
          addFuseNetwork(chainId);
        } else {
          setError({status: null, code: err.code});
        }
      });
    }  
  }

  const wrongNetwork = (res) => {
    setError({status: 'wrongNetwork', code: 310});
    setQuery({status: 'error'});
    setConnectedChain('unsupported');
    setChainId('0x00');
  }

  const getReputation = (chainId) => {
    props.getRep(chainId);
  }

  return (
    <div>
      <div>Connected Address:</div>
      {/*TODO: Fontsize 12px for mobile! */}
      <Typography variant="span" sx={{fontStyle: "italic", 
                                      fontWeight: "bold",
                                      fontSize: isMob ? "11px" : "initial"}}>
        {connectedAddress} 
      </Typography>
      <div>----------------------</div>
     <div>On network: 
      <Typography variant="span" 
                  style={{fontWeight: "bold"}}>
          {connectedChain}            
      </Typography>
      </div><br />
      <Box>   
        <Typography variant="span">
          Make sure you are connected to the network for which 
          you want to claim (Blue): 
        </Typography>
        <br />
                                 
        <SwitchAndConnectButton
          fullWidth
          variant="contained"
          className={` ${chainId == 1 ? "chain-connected" : ""} ` + 
                     ` ${isClaimed.fuse ? "chain-claimed" : ""} `
          }
          sx={{
            mt: 3,
            mb: 2,
            backgroundImage: `url('/ethereum.svg')`,
          }}
          onClick={() => switchNetwork("0x1", "fuse")}>
            {isClaimed.fuse ? <span>Claimed!</span> : ""}
          </SwitchAndConnectButton>
        
        <SwitchAndConnectButton
          fullWidth
          variant="contained"
          className={` ${chainId == 122 ? "chain-connected" : ""} ` +  
                     ` ${isClaimed.rootState ? "chain-claimed" : ""}`
          }
          sx={{
            mt: 3,
            mb: 2,
            backgroundImage: `url('/fuse.svg')`
          }}
          onClick={() => switchNetwork("0x7a", "rootState")}>
            {isClaimed.rootState ? <span>Claimed!</span>: ""}
          </SwitchAndConnectButton>
        
      </Box>
      {
        query.status === 'error' && (error.status === "wrongNetwork" || error.status === "alreadyClaimed") ? 
          <ErrorHandler action={error}/>
        :
        query.status === 'get-claim-status' ?
          <div style={{
            display: "flex",
            alignItems: 'center',
            flexDirection: "column",
          }}>
            <CircularProgress color="secondary" sx={{marginTop:"20px"}} /> <br />
            <Typography variant="span" sx={{fontStyle: 'italic'}} color="red">
                We are checking your reputation balance, please wait a moment.
            </Typography>
          </div>
        :
        <Box>
          <Button
            fullWidth
            variant="contained"
            sx={{
              mt: 3, 
              mb: 2, 
              backgroundColor: "#00C3AE", 
                '&:hover': {
                  backgroundColor: "#049484"
            }}}
            onClick={() => getReputation()}>
              Claim your tokens
          </Button>
      </Box>
      }
    </div>
  )
}