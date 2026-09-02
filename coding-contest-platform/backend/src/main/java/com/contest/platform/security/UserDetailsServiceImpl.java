package com.contest.platform.security;

import com.contest.platform.model.Role;
import com.contest.platform.model.User;
import com.contest.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (username == null || username.trim().isEmpty()) {
            throw new UsernameNotFoundException("Username cannot be empty");
        }

        String cleanUsername = username.trim();
        User user = userRepository.findByUsername(cleanUsername.toLowerCase())
                .or(() -> userRepository.findByUsername(cleanUsername))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + cleanUsername));

        Role role = user.getRole() != null ? user.getRole() : Role.TEAM;

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash() != null ? user.getPasswordHash() : "",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );
    }
}
