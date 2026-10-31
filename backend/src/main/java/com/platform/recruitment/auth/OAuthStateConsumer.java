package com.platform.recruitment.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class OAuthStateConsumer {
    private final OAuthLoginStateRepository states;
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean consume(String hash,String provider,Instant now) { return states.consume(hash,provider,now)==1; }
}
