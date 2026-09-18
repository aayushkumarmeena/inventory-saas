package com.inventory.config;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.*;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.*;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration @EnableCaching
public class RedisConfig {
    @Bean
    public RedisTemplate<String,Object> redisTemplate(RedisConnectionFactory f) {
        RedisTemplate<String,Object> t = new RedisTemplate<>();
        t.setConnectionFactory(f);
        t.setKeySerializer(new StringRedisSerializer());
        t.setHashKeySerializer(new StringRedisSerializer());
        t.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        t.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        t.afterPropertiesSet();
        return t;
    }
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory f) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ObjectMapper.DefaultTyping.NON_FINAL, JsonTypeInfo.As.PROPERTY);
        GenericJackson2JsonRedisSerializer ser = new GenericJackson2JsonRedisSerializer(mapper);
        RedisCacheConfiguration def = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5)).disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(ser));
        Map<String,RedisCacheConfiguration> caches = new HashMap<>();
        caches.put("products",   def.entryTtl(Duration.ofHours(1)));
        caches.put("categories", def.entryTtl(Duration.ofHours(24)));
        caches.put("dashboard",  def.entryTtl(Duration.ofMinutes(5)));
        caches.put("gst-config", def.entryTtl(Duration.ofHours(1)));
        return RedisCacheManager.builder(f).cacheDefaults(def).withInitialCacheConfigurations(caches).build();
    }
}
